import { useMutation } from "@tanstack/react-query"
import { useAccount, useWalletClient } from "wagmi"

type NewToken = {
  address: string
  name: string
  symbol: string
  decimals: number
}

// Connector types that support wallet_watchAsset (EIP-747)
const SUPPORTED_CONNECTOR_TYPES = ["injected", "walletConnect"]

export function useAddToken(token?: NewToken) {
  const { data: walletClient } = useWalletClient()
  const { connector } = useAccount()

  // walletConnect is needed for MetaMask Mobile connections via WalletConnect.
  // In the MetaMask Mobile in-app browser, window.ethereum is injected directly
  // (injected type), or users may connect via WalletConnect from a regular mobile
  // browser — both scenarios must be allowed.
  const canAddToken =
    !!token &&
    (!!walletClient || typeof window !== "undefined") &&
    !!connector?.type &&
    SUPPORTED_CONNECTOR_TYPES.includes(connector.type)

  const { mutate: handleAddToken, isPending: isAddingToken } = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("No token provided")

      const { address, symbol, decimals, name } = token

      // Coerce all params to plain JSON-serializable primitives.
      // WalletConnect's JSON-RPC transport uses JSON.stringify under the hood:
      // if `decimals` is a BigInt (common from viem/ethers on-chain reads) or
      // any other non-serializable type, the entire params object will be
      // transmitted as "[object Object]", causing the wallet to reject the call.
      const safeParams = {
        type: "ERC20" as const,
        options: {
          address: String(address),
          symbol: String(symbol),
          decimals: Number(decimals),
          name: String(name),
        },
      }

      // Primary path: use the wagmi walletClient (works for all connector types)
      if (walletClient) {
        return walletClient.request({
          method: "wallet_watchAsset",
          params: safeParams,
        })
      }

      // Fallback: use window.ethereum directly.
      // In MetaMask Mobile's in-app browser, the injected provider is available
      // even when wagmi hasn't yet exposed it as a walletClient (e.g. during
      // initial hydration or when the connector hasn't finished negotiating).
      if (typeof window !== "undefined" && window.ethereum) {
        return (window.ethereum as { request: (args: { method: string; params: unknown }) => Promise<unknown> }).request({
          method: "wallet_watchAsset",
          params: safeParams,
        })
      }

      throw new Error("No wallet provider available to add token")
    },
  })

  return { canAddToken, handleAddToken, isAddingToken }
}
