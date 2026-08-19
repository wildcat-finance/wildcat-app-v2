import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { invalidateMarketAccountQueries } from "@/utils/marketAccountQueries"
import { waitForSubmittedTransaction } from "@/utils/transactions"

export const useSetMinimumDeposit = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async (newMinDeposit: string) => {
      if (!marketAccount || !signer) {
        return
      }

      const tokenAmount =
        marketAccount.market.underlyingToken.parseAmount(newMinDeposit)

      const setMinDeposit = async () => {
        const hash = await marketAccount.setMinimumDeposit(tokenAmount)

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

      await setMinDeposit()
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
    },
    onError(error) {
      console.log(error)
    },
  })
}
