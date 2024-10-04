import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { BaseTransaction } from "@safe-global/safe-apps-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { GET_WITHDRAWALS_KEY } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import {
  GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY,
  GET_MARKET_ACCOUNT_KEY,
} from "@/hooks/useGetMarketAccount"

export const useRepay = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
  processUnpaidWithdrawalsIfAny?: boolean,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async (amount: TokenAmount) => {
      if (!marketAccount || !signer) {
        return
      }

      const step = marketAccount.checkRepayStep(amount)
      const gnosisTransactions: BaseTransaction[] = []
      if (step.status !== "Ready") {
        if (safeConnected && step.status === "InsufficientAllowance") {
          gnosisTransactions.push(
            await marketAccount.populateApproveMarket(amount),
          )
        } else {
          throw Error(
            `Should not be able to reach useRepay when status not ready and not connected to safe`,
          )
        }
      }

      const repay = async () => {
        const maxBatches =
          marketAccount.market.unpaidWithdrawalBatchExpiries.length
        const tx = await (processUnpaidWithdrawalsIfAny && maxBatches > 0
          ? marketAccount.market.repayAndProcessUnpaidWithdrawalBatches(
              amount,
              maxBatches,
            )
          : marketAccount.repay(amount.raw))

        if (!safeConnected) setTxHash(tx.hash)

        if (safeConnected) {
          const checkTransaction = async () => {
            const transactionBySafeHash = await sdk.txs.getBySafeTxHash(tx.hash)
            if (transactionBySafeHash?.txHash) {
              setTxHash(transactionBySafeHash.txHash)
            } else {
              setTimeout(checkTransaction, 1000)
            }
          }

          await checkTransaction()
        }

        return tx.wait()
      }

      await repay()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: [GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY],
      })
      if (processUnpaidWithdrawalsIfAny) {
        client.invalidateQueries({ queryKey: [GET_MARKET_ACCOUNT_KEY] })

        client.invalidateQueries({
          queryKey: [GET_WITHDRAWALS_KEY],
        })
      }
    },
    onError(error) {
      console.log(error)
    },
  })
}
