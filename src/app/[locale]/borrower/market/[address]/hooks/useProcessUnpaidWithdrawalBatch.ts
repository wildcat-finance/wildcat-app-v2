import { Dispatch } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { GET_WITHDRAWALS_KEY } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"
import { toastifyRequest } from "@/components/toasts"
import {
  GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY,
  GET_MARKET_ACCOUNT_KEY,
} from "@/hooks/useGetMarketAccount"
import { useGnosisSafeSDK } from "@/hooks/useGnosisSafeSDK"

export const useProcessUnpaidWithdrawalBatch = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string>>,
) => {
  const client = useQueryClient()
  const { isConnectedToSafe, sendTransactions: sendGnosisTransactions } =
    useGnosisSafeSDK()

  return useMutation({
    mutationFn: async ({
      tokenAmount,
      maxBatches,
    }: {
      tokenAmount: TokenAmount
      maxBatches: number
    }) => {
      if (!marketAccount) {
        return
      }

      const processWithdrawalBatch = async () => {
        const { status } = marketAccount.checkRepayStep(tokenAmount)
        if (isConnectedToSafe && status === "InsufficientAllowance") {
          const gnosisTransactions = [
            await marketAccount.populateApproveMarket(tokenAmount),
            await marketAccount.market.populateRepayAndProcessUnpaidWithdrawalBatches(
              tokenAmount,
              maxBatches,
            ),
          ]
          const tx = await sendGnosisTransactions(gnosisTransactions)
          await tx.wait()
        } else {
          const tx =
            await marketAccount.market.repayAndProcessUnpaidWithdrawalBatches(
              tokenAmount,
              maxBatches,
            )
          setTxHash(tx.hash)
          await tx.wait()
        }
      }

      await toastifyRequest(processWithdrawalBatch(), {
        pending: `Closing unpaid withdrawal batch...`,
        success: `Successfully closed batch!`,
        error: `Error: Closing withdrawal batch for ${marketAccount.market.name} failed`,
      })
    },
    onSuccess() {
      client.invalidateQueries({ queryKey: [GET_MARKET_ACCOUNT_KEY] })
      client.invalidateQueries({
        queryKey: [GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY],
      })
      client.invalidateQueries({
        queryKey: [GET_WITHDRAWALS_KEY],
      })
    },
  })
}
