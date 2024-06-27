import { BaseTransaction } from "@safe-global/safe-apps-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { toastifyRequest } from "@/components/toasts"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY } from "@/hooks/useGetMarketAccount"
import { useGnosisSafeSDK } from "@/hooks/useGnosisSafeSDK"
import { TOKEN_FORMAT_DECIMALS } from "@/utils/formatters"
import { waitForSubgraphSync } from "@/utils/waitForSubgraphSync"

export const useRepay = (marketAccount: MarketAccount) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { isConnectedToSafe, sendTransactions: sendGnosisTransactions } =
    useGnosisSafeSDK()

  return useMutation({
    mutationFn: async (amount: TokenAmount) => {
      if (!marketAccount || !signer) {
        return
      }

      const step = marketAccount.checkRepayStep(amount)
      const gnosisTransactions: BaseTransaction[] = []
      if (step.status !== "Ready") {
        if (isConnectedToSafe && step.status === "InsufficientAllowance") {
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
        if (gnosisTransactions.length) {
          gnosisTransactions.push(await marketAccount.populateRepay(amount.raw))
          console.log(`Sending gnosis transactions...`)
          console.log(gnosisTransactions)
          const tx = await sendGnosisTransactions(gnosisTransactions)
          console.log(
            `Got gnosis transaction:\n\tsafeTxHash: ${tx.safeTxHash}\n\ttxHash: ${tx.txHash}`,
          )
          return tx.wait()
        }
        const tx = await marketAccount.repay(amount.raw)
        return tx.wait()
      }

      const { symbol } = marketAccount.market.underlyingToken

      const tokenAmountFormatted = amount.format(TOKEN_FORMAT_DECIMALS)

      const receipt = await toastifyRequest(repay(), {
        pending: `${tokenAmountFormatted} ${symbol} Repayment In Progress...`,
        success: `Successfully Repaid ${tokenAmountFormatted} ${symbol}!`,
        error: `Error: Repayment Attempt Failed`,
      })
      await waitForSubgraphSync(receipt.blockNumber)
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: [GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY],
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
