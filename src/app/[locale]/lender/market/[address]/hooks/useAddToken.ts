import { useMutation } from "@tanstack/react-query"
import { useAccount, useWalletClient } from "wagmi"

import { toastError } from "@/components/Toasts"

type NewToken = {
  address: string
  name: string
  symbol: string
  decimals: number
}

export function useAddToken(token?: NewToken) {
  const { data: walletClient } = useWalletClient()
  const { connector } = useAccount()
  const supportsWatchAsset =
    connector?.type === "injected" || connector?.type === "metaMask"
  const canAddToken = !!token && !!walletClient && supportsWatchAsset

  const { mutate: handleAddToken, isPending: isAddingToken } = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Missing token")
      if (!walletClient || !connector) {
        throw new Error("Connect a wallet to add this token")
      }
      if (!supportsWatchAsset) {
        throw new Error(
          "Adding tokens is only supported in MetaMask (in-app browser or extension).",
        )
      }

      const { address, symbol, decimals, name } = token!

      return walletClient!.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: { address, symbol, decimals, name },
        },
      })
    },
    onError: (error: Error) => {
      toastError(error.message)
    },
  })

  return { canAddToken, handleAddToken, isAddingToken }
}
