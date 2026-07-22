/* eslint-disable no-console */
import { Dispatch, SetStateAction } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { BaseTransaction } from "@safe-global/safe-apps-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  MarketAccount,
  Signer,
  TokenAmount,
  TokenWrapper,
} from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"

// The EOA path runs two sequential transactions (unwrap, then queue). Expose
// which leg is in flight so the modal can label the loading state honestly.
export enum WrappedWithdrawStep {
  Idle = "idle",
  Unwrapping = "unwrapping",
  Queueing = "queueing",
}

/**
 * Combined "unwrap + queue withdrawal" for a lender's wrapped market-token
 * position.
 *
 * - Safe wallets: a single atomic multiSend batch
 *   [wrapper.withdraw(assets), market.queueWithdrawal(assets)]. Both legs run
 *   with msg.sender = Safe, so the market tokens unwrap to the Safe and the
 *   withdrawal is queued for the Safe in one transaction.
 * - EOA wallets: two sequential transactions (NOT atomic). The deployed
 *   contracts cannot queue on a beneficiary's behalf, so there is no way to make
 *   this atomic for a plain EOA without an on-chain change.
 *
 * The mutation input is the exact target amount of market tokens `assets`
 * (`A = previewRedeem(shares)`), computed in the modal. Using the ERC-4626
 * exact-out `withdraw(A)` guarantees exactly `A` market tokens are produced,
 * which is what lets the static Safe batch queue the same `A`.
 */
export const useWithdrawFromWrapped = (
  marketAccount: MarketAccount,
  wrapper: TokenWrapper,
  setTxHash: Dispatch<SetStateAction<string | undefined>>,
  setStep: Dispatch<SetStateAction<WrappedWithdrawStep>>,
) => {
  const { address } = useAccount()
  const client = useQueryClient()
  const { targetChainId } = useCurrentNetwork()
  const { signer } = useEthersProvider({
    chainId: marketAccount.market.chainId,
  })
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async (assets: TokenAmount) => {
      if (!address) throw new Error("No account")
      if (marketAccount.market.chainId !== targetChainId) {
        throw new Error(
          `Market chainId does not match target chainId:` +
            ` Market ${marketAccount.market.chainId},` +
            ` Target ${targetChainId}`,
        )
      }
      if (assets.raw.isZero()) throw new Error("Zero amount")

      // Ensure the wrapper can send txs from the connected signer (the query
      // that built it may have used a read-only provider).
      if (signer && Signer.isSigner(signer)) {
        wrapper.provider = signer
      }

      const { market } = marketAccount

      // The SDK exposes no populateQueueWithdrawal, so build the queue leg by
      // hand from the market contract interface.
      const queueTx: BaseTransaction = {
        to: market.address,
        data: market.contract.interface.encodeFunctionData("queueWithdrawal", [
          assets.raw,
        ]),
        value: "0",
      }

      if (safeConnected) {
        if (!sdk) throw new Error("No Safe SDK")
        setStep(WrappedWithdrawStep.Unwrapping)

        const txs: BaseTransaction[] = [
          // exact-out unwrap: produces exactly `assets` market tokens to self
          wrapper.populateWithdraw(assets, address, address),
          queueTx,
        ]
        const { safeTxHash } = await sdk.txs.send({ txs })

        const resolvedTxHash = await new Promise<string>((resolve) => {
          const check = async () => {
            const found = await sdk.txs.getBySafeTxHash(safeTxHash)
            if (found?.txHash) {
              resolve(found.txHash)
            } else {
              setTimeout(check, 1000)
            }
          }
          check()
        })
        setTxHash(resolvedTxHash)
        await sdk.eth.getTransactionReceipt([resolvedTxHash])
        return
      }

      // EOA: two sequential transactions — NOT atomic.
      setStep(WrappedWithdrawStep.Unwrapping)
      const unwrapTx = await wrapper.withdraw(assets, address, address)
      setTxHash(unwrapTx.hash)
      await unwrapTx.wait()

      setStep(WrappedWithdrawStep.Queueing)
      // NB: don't use marketAccount.queueWithdrawal here — it sends the tx with
      // ethers' exact gas estimate (no buffer). queueWithdrawal opens a new
      // withdrawal batch / processes market state, which the estimate can
      // under-provision, producing an out-of-gas revert (gasUsed == gasLimit).
      // Estimate against the post-unwrap state and add a 50% buffer.
      const marketContract = marketAccount.market.contract
      const gasEstimate = await marketContract.estimateGas.queueWithdrawal(
        assets.raw,
      )
      const queueTxEoa = await marketContract.queueWithdrawal(assets.raw, {
        gasLimit: gasEstimate.mul(3).div(2),
      })
      setTxHash(queueTxEoa.hash)
      await queueTxEoa.wait()
    },
    onSuccess() {
      setStep(WrappedWithdrawStep.Idle)
      const { chainId, address: marketAddress } = marketAccount.market

      // union of useWithdraw + WrapperSection invalidations
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET(chainId, marketAddress),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_WITHDRAWALS(
          chainId,
          "initial",
          marketAddress,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_WITHDRAWALS(
          chainId,
          "update",
          marketAddress,
        ),
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
    },
    onError(error: Error) {
      setStep(WrappedWithdrawStep.Idle)
      console.log(error)
    },
  })
}
