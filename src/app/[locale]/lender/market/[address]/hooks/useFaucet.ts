import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { toastRequest } from "@/components/Toasts"
import { QueryKeys } from "@/config/query-keys"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { waitForSubmittedTransaction } from "@/utils/transactions"

export const useFaucet = (marketAccount: MarketAccount) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()
  const { isTestnet, chainId: targetChainId } = useSelectedNetwork()

  return useMutation({
    mutationFn: async () => {
      if (
        !marketAccount ||
        !signer ||
        !marketAccount.market.underlyingToken.isMock ||
        !isTestnet
      )
        throw Error()
      if (marketAccount.market.chainId !== targetChainId) {
        throw Error(
          `Market chainId does not match target chainId:` +
            ` Market ${marketAccount.market.chainId},` +
            ` Target ${targetChainId}`,
        )
      }

      const faucet = async () => {
        const hash = await marketAccount.market.underlyingToken.faucet()
        const { receipt } = await waitForSubmittedTransaction({
          provider: signer.provider,
          hash,
          safeConnected,
          safeSdk: sdk,
        })
        return receipt
      }

      await toastRequest(faucet(), {
        error: "Failed to acquire testnet tokens",
        success: "Acquired testnet tokens!",
        pending: "Requesting testnet tokens...",
      })
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT(
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
