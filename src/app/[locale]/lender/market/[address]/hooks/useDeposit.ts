import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { BaseTransaction } from "@safe-global/safe-apps-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { useEthersSigner } from "@/hooks/useEthersSigner"
import { GET_MARKET_KEY } from "@/hooks/useGetMarket"
import { GET_MARKET_ACCOUNT_KEY } from "@/hooks/useGetMarketAccount"

export const useDeposit = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async (tokenAmount: TokenAmount) => {
      if (!marketAccount || !signer) throw Error()

      const step = marketAccount.previewDeposit(tokenAmount)

      const gnosisTransactions: BaseTransaction[] = []

      if (safeConnected && step.status === "InsufficientAllowance") {
        gnosisTransactions.push(
          await marketAccount.populateApproveMarket(tokenAmount),
        )
      }

      const deposit = async () => {
        const tx = await marketAccount.deposit(tokenAmount)

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

      await deposit()
    },
    onSuccess() {
      client.invalidateQueries({ queryKey: [GET_MARKET_KEY] })
      client.invalidateQueries({ queryKey: [GET_MARKET_ACCOUNT_KEY] })
    },
    onError(/* error */) {
      // console.log(error)
    },
  })
}
