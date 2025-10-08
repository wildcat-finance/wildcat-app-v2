import { Dispatch, SetStateAction } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useEthersSigner } from "@/hooks/useEthersSigner"

import { GET_BORROWER_MARKETS } from "../../../hooks/getMaketsHooks/useGetBorrowerMarkets"
import { GET_ALL_MARKETS } from "../../../hooks/getMaketsHooks/useGetOthersMarkets"

export const useTerminateMarket = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<SetStateAction<string | undefined>>,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async () => {
      if (!signer) {
        return
      }

      const closeMarket = async () => {
        const tx = await marketAccount.closeMarket()

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

      await closeMarket()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_BORROWER_MARKET_ACCOUNT_LEGACY(
          marketAccount.market.chainId,
          marketAccount.account,
          marketAccount.market.address,
        ),
      })
      client.invalidateQueries({
        queryKey: [GET_BORROWER_MARKETS],
      })
      client.invalidateQueries({
        queryKey: [GET_ALL_MARKETS],
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
