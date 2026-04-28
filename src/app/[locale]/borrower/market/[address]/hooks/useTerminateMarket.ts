import { Dispatch, SetStateAction } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { waitForSubmittedTransaction } from "@/utils/transactions"

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
        const hash = await marketAccount.closeMarket()

        if (!safeConnected) setTxHash(hash)

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
        queryKey: QueryKeys.Borrower.GET_OWN_MARKETS(
          marketAccount.market.chainId,
          marketAccount.account,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_ALL_MARKETS(
          marketAccount.market.chainId,
        ),
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
