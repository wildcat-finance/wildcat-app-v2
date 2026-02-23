import { useMutation } from "@tanstack/react-query"
import { useAccount, useWalletClient } from "wagmi"

type NewToken = {
  address: string
  name: string
  symbol: string
  decimals: number
}

const SUPPORTED_CONNECTOR_TYPES = ["injected", "walletConnect"]

export function useAddToken(token?: NewToken) {
  const { data: walletClient } = useWalletClient()
  const { connector } = useAccount()

  const canAddToken =
    !!token &&
    (!!walletClient || typeof window !== "undefined") &&
    !!connector?.type &&
    SUPPORTED_CONNECTOR_TYPES.includes(connector.type)

  const { mutate: handleAddToken, isPending: isAddingToken } = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("No token provided")

      const { address, symbol, decimals, name } = token

      const safeParams = {
        type: "ERC20" as const,
        options: {
          address: String(address),
          symbol: String(symbol),
          decimals: Number(decimals),
          name: String(name),
        },
      }

      if (walletClient) {
        return walletClient.request({
          method: "wallet_watchAsset",
          params: safeParams,
        })
      }

      if (typeof window !== "undefined" && window.ethereum) {
        return (
          window.ethereum as {
            request: (args: {
              method: string
              params: unknown
            }) => Promise<unknown>
          }
        ).request({
          method: "wallet_watchAsset",
          params: safeParams,
        })
      }

      throw new Error("No wallet provider available to add token")
    },
  })

  return { canAddToken, handleAddToken, isAddingToken }
}
