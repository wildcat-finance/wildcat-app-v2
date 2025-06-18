import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { QueryKey, useMutation, useQueryClient } from "@tanstack/react-query"
import { Market, Token, TokenAmount } from "@wildcatfi/wildcat-sdk"

import {
  GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY,
  GET_MARKET_ACCOUNT_KEY,
} from "@/hooks/useGetMarketAccount"

export const useApprove = (
  token: Token,
  spender: string,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
  queryKeysToInvalidate: QueryKey[] = [
    [GET_MARKET_ACCOUNT_KEY],
    [GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY],
  ],
) => {
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async (tokenAmount: TokenAmount) => {
      const approve = async () => {
        const tx = await token.contract.approve(spender, tokenAmount.raw)

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

      await approve()
    },
    onSuccess() {
      queryKeysToInvalidate.forEach((queryKey) => {
        client.invalidateQueries({ queryKey })
      })
    },
  })
}
