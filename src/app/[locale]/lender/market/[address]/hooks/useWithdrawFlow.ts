/* eslint-disable no-console */
import { useCallback, useMemo, useRef, useState } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { BaseTransaction } from "@safe-global/safe-apps-sdk"
import { useQueryClient } from "@tanstack/react-query"
import {
  MarketAccount,
  MarketVersion,
  QueueWithdrawalStatus,
  Signer,
  TokenAmount,
  TokenWrapper,
  typechain,
} from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import { useAccount } from "wagmi"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { SDK_ERRORS_MAPPING } from "@/utils/errors"

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
const SAFE_QUEUE_MARGIN_WEI = BigNumber.from(8)

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
  const { signer } = useEthersProvider({ chainId: market.chainId })
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
  const directBeforeUnwrap = useRef<BigNumber>()

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
    client.invalidateQueries({
      queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT.PREFIX(
        chainId,
        marketAddress,
        accountAddress,
      ),
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
        queryKey: QueryKeys.Wrapper.GET_BALANCES(
          chainId,
          wrapper.address,
          address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Wrapper.GET_LIMITS(
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
      logs: { topics: string[]; data: string }[],
    ): { queuedAmount: TokenAmount; expiry: number } | undefined => {
      const iface = market.contract.interface
      const topic = iface.getEventTopic("WithdrawalQueued")
      const log = logs.find((l) => l.topics[0] === topic)
      if (!log) return undefined
      const parsed = iface.parseLog(log)
      return {
        queuedAmount: market.underlyingToken.getAmount(
          parsed.args.normalizedAmount,
        ),
        expiry: BigNumber.from(parsed.args.expiry).toNumber(),
      }
    },
    [market],
  )

  /** Static queue amount for a Safe batch (see SAFE_QUEUE_MARGIN_WEI). */
  const staticQueueRaw = useCallback((route: WithdrawRoute) => {
    if (!route.usesWrapped) return route.amount.raw
    const shaved = route.amount.raw.sub(SAFE_QUEUE_MARGIN_WEI)
    return shaved.gt(0) ? shaved : route.amount.raw
  }, [])

  const runUnwrap = useCallback(
    async (route: WithdrawRoute) => {
      if (!wrapper || !address) throw new Error("No wrapper")
      bindWrapperSigner()

      directBeforeUnwrap.current = route.keepsDirect
        ? await market.contract.balanceOf(address)
        : undefined

      if (route.isFullWrapped) {
        const shares = wrapper.shareToken.getAmount(
          await wrapper.shareToken.contract.balanceOf(address),
        )
        if (!shares.raw.isZero()) {
          const redeemTx = await wrapper.redeem(shares, address, address)
          setTxHash(redeemTx.hash)
          await redeemTx.wait()
          return
        }
      }

      // Exact-out: produces exactly `fromWrapped` market tokens to self.
      const tx = await wrapper.withdraw(route.fromWrapped, address, address)
      setTxHash(tx.hash)
      await tx.wait()
    },
    [wrapper, address, market, bindWrapperSigner],
  )

  const runQueue = useCallback(
    async (route: WithdrawRoute) => {
      if (!address || !signer) throw new Error("No signer")
      assertCanQueue()

      const marketWrite = typechain.WildcatMarket__factory.connect(
        market.address,
        signer,
      )

      // Measure against the LIVE balance: the direct part and the
      // just-unwrapped part are scaled independently, so the intended sum can
      // exceed the credited balance by a wei and revert — and a max request has
      // to pick up whatever accrued while the lender was signing.
      const live: BigNumber = await marketWrite.balanceOf(address)
      const queueRaw = resolveWithdrawalQueueRaw({
        intent: route.amount.raw,
        live,
        isMaxRequested: route.isMaxRequested,
        keepsDirect: route.keepsDirect,
        directBeforeUnwrap: directBeforeUnwrap.current,
      })
      if (queueRaw.isZero()) {
        throw new Error("Nothing available to queue")
      }

      const useFullWithdrawal =
        market.version === MarketVersion.V2 && route.isFullMax

      let tx
      if (useFullWithdrawal) {
        const marketV2 = typechain.WildcatMarketV2__factory.connect(
          market.address,
          signer,
        )
        const gas = await marketV2.estimateGas.queueFullWithdrawal()
        tx = await marketV2.queueFullWithdrawal({
          gasLimit: gas.mul(3).div(2),
        })
      } else {
        // queueWithdrawal opens a new withdrawal batch / processes market
        // state; ethers' exact estimate can under-provision it, so buffer 50%.
        const gas = await marketWrite.estimateGas.queueWithdrawal(queueRaw)
        tx = await marketWrite.queueWithdrawal(queueRaw, {
          gasLimit: gas.mul(3).div(2),
        })
      }

      setTxHash(tx.hash)
      const receipt = await tx.wait()
      const queued = decodeQueued(receipt.logs)
      setResult({
        queuedAmount:
          queued?.queuedAmount ?? market.underlyingToken.getAmount(queueRaw),
        expiry: queued?.expiry ?? 0,
        txHash: tx.hash,
      })
    },
    [address, signer, market, assertCanQueue, decodeQueued],
  )

  const runBatched = useCallback(
    async (route: WithdrawRoute) => {
      if (!sdk) throw new Error("No Safe SDK")
      if (!address) throw new Error("No account")
      assertCanQueue()
      bindWrapperSigner()

      const txs: BaseTransaction[] = []

      if (route.usesWrapped) {
        if (!wrapper) throw new Error("No wrapper")
        txs.push(
          route.isFullWrapped && route.sharesToRedeem
            ? wrapper.populateRedeem(route.sharesToRedeem, address, address)
            : wrapper.populateWithdraw(route.fromWrapped, address, address),
        )
      }

      const useFullWithdrawal =
        market.version === MarketVersion.V2 && route.isFullMax

      if (useFullWithdrawal) {
        // market.contract is built from the V1 ABI, which has no
        // queueFullWithdrawal — encode from the V2 interface.
        const v2Interface = typechain.WildcatMarketV2__factory.createInterface()
        txs.push({
          to: market.address,
          data: v2Interface.encodeFunctionData("queueFullWithdrawal"),
          value: "0",
        })
      } else {
        txs.push({
          to: market.address,
          data: market.contract.interface.encodeFunctionData(
            "queueWithdrawal",
            [staticQueueRaw(route)],
          ),
          value: "0",
        })
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
      const queued = receipt?.logs ? decodeQueued(receipt.logs) : undefined
      setResult({
        queuedAmount: queued?.queuedAmount ?? route.amount,
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
