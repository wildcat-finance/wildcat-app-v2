import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  MarketAccount,
  prepareTransaction,
  wildcatMarketV2Abi,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import {
  toSdkTransactionRequest,
  waitForSubmittedTransaction,
} from "@/utils/transactions"

export const useResetTempReserveRatio = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const { signer, targetChainId } = useEthersProvider()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async () => {
      if (!marketAccount || !signer) {
        return
      }
      if (marketAccount.chainId !== targetChainId) {
        throw Error(
          `Market chainId does not match target chainId:` +
            ` Market ${marketAccount.market.chainId},` +
            ` Target ${targetChainId}`,
        )
      }

      const { market } = marketAccount

      const resetRatio = async () => {
        const tx = prepareTransaction({
          to: market.address,
          abi: wildcatMarketV2Abi,
          functionName: "setAnnualInterestAndReserveRatioBips",
          args: [market.annualInterestBips, market.reserveRatioBips],
        })
        const { hash } = await signer.sendTransaction(
          toSdkTransactionRequest(tx),
        )

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

      await resetRatio()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT.PREFIX(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
