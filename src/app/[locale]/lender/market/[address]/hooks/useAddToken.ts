import { useCallback, useState } from "react"

import { useWalletClient } from "wagmi"

import { toastError } from "@/components/Toasts"

type WatchableToken = {
  address: string
  symbol: string
  decimals: number
}

export function useAddToken(token?: WatchableToken) {
  const { data: walletClient } = useWalletClient()
  const [isAddingToken, setIsAddingToken] = useState(false)

  const canAddToken = !!token && !!walletClient

  const handleAddToken = useCallback(async () => {
    if (!token || !walletClient) return

    setIsAddingToken(true)
    try {
      await walletClient.watchAsset({
        type: "ERC20",
        options: {
          address: token.address,
          symbol: token.symbol,
          decimals: token.decimals,
        },
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add token"
      toastError(message)
    } finally {
      setIsAddingToken(false)
    }
  }, [token, walletClient])

  return { canAddToken, handleAddToken, isAddingToken }
}
