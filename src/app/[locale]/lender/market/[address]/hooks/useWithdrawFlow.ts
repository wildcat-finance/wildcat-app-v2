/* eslint-disable no-console */
import { useCallback, useMemo, useRef, useState } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useQueryClient } from "@tanstack/react-query"
import {
  MarketAccount,
  MarketVersion,
  PartialTransaction,
  prepareTransaction,
  QueueWithdrawalStatus,
  SafeTransactionInput,
  Signer,
  TokenAmount,
  TokenWrapper,
  toSafeTransactionInput,
  wildcatMarketAbi,
  wildcatMarketV2Abi,
} from "@wildcatfi/wildcat-sdk"
import { decodeEventLog, Hex } from "viem"
import { useAccount } from "wagmi"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { SDK_ERRORS_MAPPING } from "@/utils/errors"
import { invalidateMarketStateQueries } from "@/utils/marketStateQueries"
import { toViemTransactionRequest } from "@/utils/transactions"

import { WithdrawRoute } from "./useWithdrawRouting"
import { resolveWithdrawalQueueRaw } from "./withdrawQueue"

export enum WithdrawLegKind {
  /** ERC-4626 exact-out unwrap of the wrapped portion. */
  Unwrap = "unwrap",
  /** market.queueWithdrawal for the combined amount. */
  Queue = "queue",
  /** Safe multiSend doing both in one atomic transaction. */
  Batched = "batched",
}

export enum LegStatus {
  Waiting = "waiting",
  Active = "active",
  Busy = "busy",
  Done = "done",
  Failed = "failed",
}

export type WithdrawLeg = {
  kind: WithdrawLegKind
  /** 1-based position, for "Step n of m". */
  n: number
}

export type WithdrawResult = {
  /** Amount actually queued, decoded from the WithdrawalQueued event. */
  queuedAmount: TokenAmount
  expiry: number
  txHash?: string
}

type TransactionLog = {
  data: string
  topics: readonly string[]
}

/**
 * A few wei of head-room for the statically-encoded Safe batch.
 *
 * Market balances are `rayMul(scaledBalance, scaleFactor)` and scaling rounds
 * half-up in both directions, so rounding the direct part and the unwrapped
 * part independently and re-scaling the sum can overshoot the credited balance
 * by 1 wei. In a Safe batch both legs land in the same block, so there is no
 * interest accrual to absorb that. Queueing a hair less always succeeds; the
 * shaved dust stays in the position.
 */
const SAFE_QUEUE_MARGIN_WEI = BigInt(8)

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

const SAFE_POLL_INTERVAL_MS = 1000
const SAFE_POLL_MAX_ATTEMPTS = 180

/** Legs a route needs. Safe batches the unwrap and the queue into one tx. */
const buildLegs = (route: WithdrawRoute, isBatched: boolean): WithdrawLeg[] => {
  if (!route.usesWrapped) return [{ kind: WithdrawLegKind.Queue, n: 1 }]
  if (isBatched) return [{ kind: WithdrawLegKind.Batched, n: 1 }]
  return [
    { kind: WithdrawLegKind.Unwrap, n: 1 },
    { kind: WithdrawLegKind.Queue, n: 2 },
  ]
}

/**
 * Leg-by-leg execution engine for a (possibly routed) withdrawal.
 *
 * - Safe wallets get one atomic multiSend (`msg.sender` is the Safe for both
 *   inner calls, so the market tokens unwrap to the Safe and the withdrawal is
 *   queued for the Safe).
 * - EOAs get two sequential transactions. This is not atomic and cannot be:
 *   `queueWithdrawal` has no beneficiary parameter, so no router can queue on
 *   the lender's behalf.
 *
 * Retrying is scoped to the leg that failed — re-running the whole flow after a
 * failed queue leg would unwrap a second time.
 */
export const useWithdrawFlow = ({
  marketAccount,
  wrapper,
}: {
  marketAccount: MarketAccount
  wrapper?: TokenWrapper
}) => {
  const { market } = marketAccount
  const { address } = useAccount()
  const client = useQueryClient()
  const { targetChainId } = useCurrentNetwork()
  const { signer, publicClient, walletClient } = useEthersProvider({
    chainId: market.chainId,
  })
  const { connected: safeConnected, sdk, safe } = useSafeAppsSDK()

  const isBatched = safeConnected
  const isMultisig = safeConnected && (safe?.threshold ?? 1) > 1

  const [snapshot, setSnapshot] = useState<WithdrawRoute>()
  const [currentLeg, setCurrentLeg] = useState(0)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [error, setError] = useState<string>()
  const [txHash, setTxHash] = useState<string>()
  const [result, setResult] = useState<WithdrawResult>()
  /** Safe transaction proposed but not yet executed (threshold > 1). */
  const [proposed, setProposed] = useState(false)
  const directBeforeUnwrap = useRef<bigint>()
  const unwrapSubmitted = useRef(false)

  const legs: WithdrawLeg[] = useMemo(
    () => (snapshot ? buildLegs(snapshot, isBatched) : []),
    [snapshot, isBatched],
  )

  const legStatus = useCallback(
    (index: number): LegStatus => {
      if (index < currentLeg) return LegStatus.Done
      if (index > currentLeg) return LegStatus.Waiting
      if (failed) return LegStatus.Failed
      if (busy) return LegStatus.Busy
      return LegStatus.Active
    },
    [currentLeg, failed, busy],
  )

  const invalidate = useCallback(() => {
    const { chainId, address: marketAddress } = market
    const accountAddress = marketAccount.account.toLowerCase()

    client.invalidateQueries({
      queryKey: QueryKeys.Markets.GET_MARKET(chainId, marketAddress),
    })
    invalidateMarketStateQueries({
      client,
      chainId,
      marketAddress,
      accountAddress,
    })
    client.invalidateQueries({
      queryKey: QueryKeys.Lender.GET_WITHDRAWALS.PREFIX(
        chainId,
        accountAddress,
        marketAddress,
      ),
    })
    client.invalidateQueries({
      queryKey: QueryKeys.Borrower.GET_WITHDRAWALS.PREFIX(
        chainId,
        marketAddress,
      ),
    })
    if (wrapper) {
      client.invalidateQueries({
        queryKey: QueryKeys.Wrapper.PREVIEW(wrapper.address),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Wrapper.GET_ACCOUNT_STATE(
          chainId,
          wrapper.address,
          address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Wrapper.GET_ADOPTION(
          chainId,
          wrapper.address,
          "lender",
          address,
        ),
      })
    }
  }, [client, market, marketAccount.account, wrapper, address])

  const assertReady = useCallback(() => {
    if (!address) throw new Error("No account")
    if (market.chainId !== targetChainId) {
      throw new Error(
        `Market chainId does not match target chainId:` +
          ` Market ${market.chainId}, Target ${targetChainId}`,
      )
    }
  }, [address, market.chainId, targetChainId])

  /**
   * The queue leg can become impossible between legs — a PeriodicTerm window
   * can close, a credential can lapse. Re-check before spending a signature,
   * so we do not strand a lender holding unwrapped market tokens.
   */
  const assertCanQueue = useCallback(() => {
    const availability = marketAccount.withdrawalAvailability
    if (availability !== QueueWithdrawalStatus.Ready) {
      throw new Error(
        SDK_ERRORS_MAPPING.queueWithdrawal[availability] ??
          "Withdrawals are not available for this market right now",
      )
    }
  }, [marketAccount])

  const bindWrapperSigner = useCallback(() => {
    if (wrapper && signer && Signer.isSigner(signer)) {
      wrapper.provider = signer
    }
  }, [wrapper, signer])

  const decodeQueued = useCallback(
    (
      logs: readonly TransactionLog[],
    ): { queuedAmount: TokenAmount; expiry: number } | undefined =>
      logs.reduce<{ queuedAmount: TokenAmount; expiry: number } | undefined>(
        (queued, log) => {
          if (queued) return queued
          try {
            const parsed = decodeEventLog({
              abi: wildcatMarketAbi,
              eventName: "WithdrawalQueued",
              data: log.data as Hex,
              topics: log.topics as [Hex, ...Hex[]],
            })
            return {
              queuedAmount: market.underlyingToken.getAmount(
                parsed.args.normalizedAmount,
              ),
              expiry: Number(parsed.args.expiry),
            }
          } catch {
            // Ignore unrelated logs in the transaction receipt.
            return undefined
          }
        },
        undefined,
      ),
    [market],
  )

  /** Static queue amount for a Safe batch (see SAFE_QUEUE_MARGIN_WEI). */
  const staticQueueRaw = useCallback((route: WithdrawRoute) => {
    if (!route.usesWrapped) return route.amount.raw
    const shaved = route.amount.raw - SAFE_QUEUE_MARGIN_WEI
    return shaved > BigInt(0) ? shaved : route.amount.raw
  }, [])

  const runUnwrap = useCallback(
    async (route: WithdrawRoute) => {
      if (!wrapper || !address || !signer) throw new Error("No wrapper signer")
      bindWrapperSigner()

      if (route.keepsDirect && directBeforeUnwrap.current === undefined) {
        directBeforeUnwrap.current = (
          await market.marketToken.balanceOf(address)
        ).raw
      }

      if (route.isFullWrapped) {
        const shares = await wrapper.shareToken.balanceOf(address)
        if (shares.raw.isZero()) {
          if (unwrapSubmitted.current) return
          throw new Error("No wrapped balance available to withdraw")
        }
        const hash = await wrapper.redeem(shares, address, address)
        unwrapSubmitted.current = true
        setTxHash(hash.toString())
        await hash.wait()
        return
      }

      // Exact-out: produces exactly `fromWrapped` market tokens to self.
      const hash = await wrapper.withdraw(route.fromWrapped, address, address)
      unwrapSubmitted.current = true
      setTxHash(hash.toString())
      await hash.wait()
    },
    [wrapper, address, signer, market, bindWrapperSigner],
  )

  const submitQueueTransaction = useCallback(
    async (transaction: PartialTransaction) => {
      const account = walletClient?.account
      const chain = walletClient?.chain
      if (!account || !chain || !publicClient) {
        throw new Error("No wallet client")
      }

      const request = toViemTransactionRequest(transaction)
      const estimatedGas = await publicClient.estimateGas({
        account,
        ...request,
      })
      const gas = (estimatedGas * BigInt(3)) / BigInt(2)
      const hash = await walletClient.sendTransaction({
        account,
        chain,
        ...request,
        gas,
      })
      setTxHash(hash)
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      return { hash, receipt }
    },
    [publicClient, walletClient],
  )

  const runQueue = useCallback(
    async (route: WithdrawRoute) => {
      if (!address) throw new Error("No account")
      assertCanQueue()

      // Measure against the LIVE balance: the direct part and the
      // just-unwrapped part are scaled independently, so the intended sum can
      // exceed the credited balance by a wei and revert — and a max request has
      // to pick up whatever accrued while the lender was signing.
      const live = (await market.marketToken.balanceOf(address)).raw
      const queueRaw = resolveWithdrawalQueueRaw({
        intent: route.amount.raw,
        live,
        isMaxRequested: route.isMaxRequested,
        keepsDirect: route.keepsDirect,
        directBeforeUnwrap: directBeforeUnwrap.current,
      })
      if (queueRaw === BigInt(0)) {
        throw new Error("Nothing available to queue")
      }

      const useFullWithdrawal =
        market.version === MarketVersion.V2 && route.isFullMax

      const transaction = useFullWithdrawal
        ? prepareTransaction({
            to: market.address,
            abi: wildcatMarketV2Abi,
            functionName: "queueFullWithdrawal",
          })
        : prepareTransaction({
            to: market.address,
            abi: wildcatMarketAbi,
            functionName: "queueWithdrawal",
            args: [queueRaw],
          })

      // Queueing can open a batch and process market state. Keep develop's 50%
      // gas headroom rather than relying on the exact simulation estimate.
      const { hash, receipt } = await submitQueueTransaction(transaction)
      const queued = decodeQueued(receipt.logs)
      setResult({
        queuedAmount:
          queued?.queuedAmount ?? market.underlyingToken.getAmount(queueRaw),
        expiry: queued?.expiry ?? 0,
        txHash: hash,
      })
    },
    [address, market, assertCanQueue, submitQueueTransaction, decodeQueued],
  )

  const runBatched = useCallback(
    async (route: WithdrawRoute) => {
      if (!sdk) throw new Error("No Safe SDK")
      if (!address) throw new Error("No account")
      assertCanQueue()
      bindWrapperSigner()

      const txs: SafeTransactionInput[] = []

      if (route.usesWrapped) {
        if (!wrapper) throw new Error("No wrapper")
        txs.push(
          toSafeTransactionInput(
            route.isFullWrapped && route.sharesToRedeem
              ? wrapper.populateRedeem(route.sharesToRedeem, address, address)
              : wrapper.populateWithdraw(route.fromWrapped, address, address),
          ),
        )
      }

      const useFullWithdrawal =
        market.version === MarketVersion.V2 && route.isFullMax

      if (useFullWithdrawal) {
        txs.push(
          toSafeTransactionInput(
            prepareTransaction({
              to: market.address,
              abi: wildcatMarketV2Abi,
              functionName: "queueFullWithdrawal",
            }),
          ),
        )
      } else {
        txs.push(
          toSafeTransactionInput(
            prepareTransaction({
              to: market.address,
              abi: wildcatMarketAbi,
              functionName: "queueWithdrawal",
              args: [staticQueueRaw(route)],
            }),
          ),
        )
      }

      const { safeTxHash } = await sdk.txs.send({ txs })

      if (isMultisig) {
        // Nothing is on-chain yet: the transaction is proposed and waits for
        // the co-signers. Do not claim the withdrawal was queued.
        setProposed(true)
        return
      }

      let resolvedHash: string | undefined
      for (let i = 0; i < SAFE_POLL_MAX_ATTEMPTS; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const found = await sdk.txs.getBySafeTxHash(safeTxHash)
        if (found?.txHash) {
          resolvedHash = found.txHash
          break
        }
        // eslint-disable-next-line no-await-in-loop
        await sleep(SAFE_POLL_INTERVAL_MS)
      }

      if (!resolvedHash) {
        // Bounded wait: surface it instead of spinning forever.
        setProposed(true)
        return
      }

      setTxHash(resolvedHash)
      const receipt = await sdk.eth.getTransactionReceipt([resolvedHash])
      const queued = receipt?.logs
        ? decodeQueued(receipt.logs as TransactionLog[])
        : undefined
      setResult({
        queuedAmount:
          queued?.queuedAmount ??
          market.underlyingToken.getAmount(staticQueueRaw(route)),
        expiry: queued?.expiry ?? 0,
        txHash: resolvedHash,
      })
    },
    [
      sdk,
      address,
      wrapper,
      market,
      isMultisig,
      assertCanQueue,
      bindWrapperSigner,
      staticQueueRaw,
      decodeQueued,
    ],
  )

  const start = useCallback((route: WithdrawRoute) => {
    directBeforeUnwrap.current = undefined
    unwrapSubmitted.current = false
    setSnapshot(route)
    setCurrentLeg(0)
    setBusy(false)
    setFailed(false)
    setError(undefined)
    setTxHash(undefined)
    setResult(undefined)
    setProposed(false)
  }, [])

  const runLeg = useCallback(
    async (route: WithdrawRoute, leg: WithdrawLeg) => {
      setBusy(true)
      setFailed(false)
      setError(undefined)

      try {
        assertReady()
        if (leg.kind === WithdrawLegKind.Unwrap) {
          await runUnwrap(route)
        } else if (leg.kind === WithdrawLegKind.Batched) {
          await runBatched(route)
        } else {
          await runQueue(route)
        }
        setCurrentLeg((prev) => prev + 1)
        invalidate()
      } catch (e) {
        const err = e as Error & { reason?: string }
        console.log(err)
        setFailed(true)
        setError(err.reason || err.message || "Transaction failed")
      } finally {
        setBusy(false)
      }
    },
    [assertReady, runUnwrap, runBatched, runQueue, invalidate],
  )

  const signCurrent = useCallback(() => {
    if (!snapshot || busy) return undefined
    const leg = legs[currentLeg]
    if (!leg) return undefined
    return runLeg(snapshot, leg)
  }, [snapshot, busy, legs, currentLeg, runLeg])

  /**
   * Snapshot the route and, when it only needs ONE transaction, request the
   * signature immediately — a single-step flow never shows the steps screen.
   */
  const begin = useCallback(
    (route: WithdrawRoute) => {
      start(route)
      const routeLegs = buildLegs(route, isBatched)
      if (routeLegs.length === 1) {
        return runLeg(route, routeLegs[0])
      }
      return undefined
    },
    [start, isBatched, runLeg],
  )

  const reset = useCallback(() => {
    directBeforeUnwrap.current = undefined
    unwrapSubmitted.current = false
    setSnapshot(undefined)
    setCurrentLeg(0)
    setBusy(false)
    setFailed(false)
    setError(undefined)
    setTxHash(undefined)
    setResult(undefined)
    setProposed(false)
  }, [])

  const isComplete = !!snapshot && legs.length > 0 && currentLeg >= legs.length

  return {
    snapshot,
    legs,
    currentLeg,
    legStatus,
    busy,
    failed,
    error,
    txHash,
    result,
    proposed,
    isComplete,
    isBatched,
    isMultisig,
    safeThreshold: safe?.threshold ?? 1,
    start,
    begin,
    signCurrent,
    reset,
  }
}
