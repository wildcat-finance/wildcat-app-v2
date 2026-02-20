import { useCallback, useState } from "react"

import { useAccount } from "wagmi"

import { toastError } from "@/components/Toasts"

type WatchableToken = {
  address: string
  symbol: string
  decimals: number
}

export function useAddToken(token?: WatchableToken) {
  const { connector } = useAccount()
  const [isAddingToken, setIsAddingToken] = useState(false)

  const canAddToken = !!token && !!connector

  const handleAddToken = useCallback(async () => {
    if (!token || !connector) return

    setIsAddingToken(true)
    try {
      const provider = (await connector.getProvider()) as {
        request: (args: {
          method: string
          params: Record<string, unknown>
        }) => Promise<boolean>
      }

      await provider.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: String(token.address),
            symbol: String(token.symbol).slice(0, 11),
            decimals: Number(token.decimals),
          },
        },
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add token"
      toastError(message)
    } finally {
      setIsAddingToken(false)
    }
  }, [token, connector])

  return { canAddToken, handleAddToken, isAddingToken }
}
