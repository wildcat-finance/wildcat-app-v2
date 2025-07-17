import { useMutation } from "@tanstack/react-query"
import { useAccount, useWalletClient } from "wagmi"

type NewToken = {
  address: string
  name: string
  symbol: string
  decimals: number
}

export function useAddToken(token?: NewToken) {
  const { data: walletClient } = useWalletClient()
  const { connector } = useAccount()
  const canAddToken =
    !!token && !!walletClient && connector?.type === "injected"

  const { mutate: handleAddToken, isPending: isAddingToken } = useMutation({
    mutationFn: async () => {
      if (!canAddToken) throw new Error("Wallet cannot add token")

      const { address, symbol, decimals, name } = token!

      return walletClient!.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: { address, symbol, decimals, name },
        },
      })
    },
  })

  return { canAddToken, handleAddToken, isAddingToken }
}