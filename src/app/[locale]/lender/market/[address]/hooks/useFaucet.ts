import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { BaseTransaction } from "@safe-global/safe-apps-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketAccount, SupportedChainId, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { useEthersSigner } from "@/hooks/useEthersSigner"
import { GET_MARKET_KEY } from "@/hooks/useGetMarket"
import { GET_MARKET_ACCOUNT_KEY } from "@/hooks/useGetMarketAccount"
import { TargetChainId } from "@/config/network"
import { toastRequest } from "@/components/Toasts"

export const useFaucet = (
  marketAccount: MarketAccount,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  return useMutation({
    mutationFn: async () => {
      if (
        !marketAccount ||
        !signer ||
        !marketAccount.market.underlyingToken.isMock ||
        TargetChainId !== SupportedChainId.Sepolia
      )
        throw Error()


      const faucet = async () => {
        const tx = await marketAccount.market.underlyingToken.faucet()
        return tx.wait()
      }

      await toastRequest(faucet(), {
        error: "Failed to acquire testnet tokens",
        success: "Acquired testnet tokens!",
        pending: "Requesting testnet tokens...",
      })

    },
    onSuccess() {
      client.invalidateQueries({ queryKey: [GET_MARKET_KEY] })
      client.invalidateQueries({ queryKey: [GET_MARKET_ACCOUNT_KEY] })
    },
    onError(error) {
      console.log(error)
    },
  })
}
