/* eslint-disable no-console */
import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  MarketAccount,
  MAX_UNPAID_BATCHES_PER_SETTLEMENT_TX,
  SafeTransactionInput,
  TokenAmount,
  toSafeTransactionInput,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { isUSDTLikeToken } from "@/utils/constants"
import { invalidateMarketAccountQueries } from "@/utils/marketAccountQueries"
import { waitForSubmittedTransaction } from "@/utils/transactions"

export const useRepay = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
  processUnpaidWithdrawalsIfAny?: boolean,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()
  const { targetChainId } = useCurrentNetwork()

  const shouldProcessUnpaidWithdrawals = (amount: TokenAmount): boolean => {
    const { market } = marketAccount
    const maxBatches = market.unpaidWithdrawalBatchExpiries.length
    if (maxBatches === 0) return false

    const projectedAssets = market.totalAssets.add(amount.raw)
    const withdrawalObligations = market.normalizedUnclaimedWithdrawals.add(
      market.lastAccruedProtocolFees.raw,
    )

    return projectedAssets.gte(withdrawalObligations)
  }

  return useMutation({
    mutationFn: async (amount: TokenAmount) => {
      if (!marketAccount || !signer) {
        return
      }
      if (marketAccount.market.chainId !== targetChainId) {
        throw Error(
          `Market chainId does not match target chainId:` +
            ` Market ${marketAccount.market.chainId},` +
            ` Target ${targetChainId}`,
        )
      }

      const step = marketAccount.previewRepay(amount)
      const gnosisTransactions: SafeTransactionInput[] = []
      if (step.status !== "Ready") {
        if (safeConnected && step.status === "InsufficientAllowance") {
          if (
            marketAccount.underlyingApproval > BigInt(0) &&
            isUSDTLikeToken(marketAccount.market.underlyingToken.address)
          ) {
            gnosisTransactions.push(
              toSafeTransactionInput(
                await marketAccount.populateApproveMarket(
                  amount.token.getAmount(0),
                ),
              ),
            )
          }
          gnosisTransactions.push(
            toSafeTransactionInput(
              await marketAccount.populateApproveMarket(amount),
            ),
          )
        } else {
          throw Error(
            `Should not be able to reach useRepay when status not ready and not connected to safe`,
          )
        }
      }

      const repay = async () => {
        // Per-tx cap rather than the snapshot batch count: headroom is a no-op
        // on-chain and a snapshot can go stale.
        const maxBatches = MAX_UNPAID_BATCHES_PER_SETTLEMENT_TX
        const processUnpaidWithdrawals = shouldProcessUnpaidWithdrawals(amount)
        if (gnosisTransactions.length) {
          gnosisTransactions.push(
            toSafeTransactionInput(
              processUnpaidWithdrawals
                ? await marketAccount.market.populateRepayAndProcessUnpaidWithdrawalBatches(
                    amount,
                    maxBatches,
                  )
                : await marketAccount.populateRepay(amount.raw),
            ),
          )
          console.log(`Sending gnosis transactions...`)
          console.log(gnosisTransactions)
          const { safeTxHash } = await sdk.txs.send({
            txs: gnosisTransactions,
          })
          console.log(`Got gnosis transaction:\n\tsafeTxHash: ${safeTxHash}`)
          const { hash: transactionHash, receipt } =
            await waitForSubmittedTransaction({
              provider: signer.provider,
              hash: safeTxHash,
              safeConnected: true,
              safeSdk: sdk,
            })
          setTxHash(transactionHash)
          console.log(
            `Got gnosis transaction receipt:\n\ttxHash: ${transactionHash}`,
          )
          return receipt
        }
        const hash = processUnpaidWithdrawals
          ? await marketAccount.market.repayAndProcessUnpaidWithdrawalBatches(
              amount,
              maxBatches,
            )
          : await marketAccount.repay(amount.raw)

        if (!safeConnected) setTxHash(hash.toString())

        const { hash: transactionHash, receipt } =
          await waitForSubmittedTransaction({
            provider: signer.provider,
            hash,
            safeConnected,
            safeSdk: sdk,
          })
        setTxHash(transactionHash)
        return receipt
      }

      await repay()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
      invalidateMarketAccountQueries({
        client,
        chainId: marketAccount.market.chainId,
        marketAddress: marketAccount.market.address,
        accountAddress: marketAccount.account,
      })
      if (processUnpaidWithdrawalsIfAny) {
        client.invalidateQueries({
          queryKey: QueryKeys.Borrower.GET_WITHDRAWALS.PREFIX(
            marketAccount.market.chainId,
            marketAccount.market.address,
          ),
        })
      }
    },
    onError(error) {
      console.log(error)
    },
  })
}
