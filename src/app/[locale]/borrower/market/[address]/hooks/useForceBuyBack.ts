import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { useEthersSigner } from "@/hooks/useEthersSigner"
import { GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY } from "@/hooks/useGetMarketAccount"

import { GET_MARKET_LENDERS_KEY } from "./useGetMarketLenders"

export const useForceBuyBack = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async ({
      lender,
      amount,
    }: {
      lender: string
      amount: string
    }) => {
      if (!marketAccount || !signer) {
        return
      }

      // const tokenAmount = new TokenAmount(
      //   parseUnits(amount, marketAccount.market.underlyingToken.decimals),
      //   marketAccount.market.underlyingToken,
      // )
      const tokenAmount =
        marketAccount.market.underlyingToken.parseAmount(amount)

      const forceBuyBack = async () => {
        const tx = await marketAccount.forceBuyBack(lender, tokenAmount)

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

      await forceBuyBack()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: [GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY],
      })
      client.invalidateQueries({
        queryKey: [GET_MARKET_LENDERS_KEY],
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
