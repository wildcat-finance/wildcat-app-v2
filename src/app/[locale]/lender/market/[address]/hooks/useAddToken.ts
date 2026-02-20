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
      const params = {
        type: "ERC20" as const,
        options: {
          address: token.address,
          symbol: token.symbol,
          decimals: Number(token.decimals),
        },
      }

      if (
        typeof window !== "undefined" &&
        (window as typeof window & { ethereum?: { isMetaMask?: boolean } })
          .ethereum?.isMetaMask
      ) {
        await (
          window as typeof window & {
            ethereum?: { request?: (args: unknown) => Promise<unknown> }
          }
        ).ethereum?.request?.({
          method: "wallet_watchAsset",
          params,
        })
      } else {
        await walletClient.watchAsset(params)
      }
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
