import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { invalidateMarketStateQueries } from "@/utils/marketStateQueries"
import { waitForSubmittedTransaction } from "@/utils/transactions"

export const useSetMaxTotalSupply = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const { signer, targetChainId } = useEthersProvider()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async (newMaxTotalSupply: string) => {
      if (!marketAccount || !signer) {
        return
      }
      if (marketAccount.market.chainId !== targetChainId) {
        throw Error(
          `Signer chainId does not match market or target chainId:` +
            ` Market ${marketAccount.market.chainId},` +
            ` Target ${targetChainId}`,
        )
      }

      const supplyTokenAmount =
        marketAccount.market.underlyingToken.parseAmount(newMaxTotalSupply)

      const setMaxTotalSupply = async () => {
        const hash = await marketAccount.setMaxTotalSupply(supplyTokenAmount)

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

      await setMaxTotalSupply()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
      invalidateMarketStateQueries({
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
