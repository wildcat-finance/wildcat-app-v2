import { useCallback, useState } from "react"

import { useAccount, useWalletClient } from "wagmi"

import { toastError } from "@/components/Toasts"

type WatchableToken = {
  address: string
  symbol: string
  decimals: number
}

const safeStringify = (value: unknown) => {
  try {
    if (value && typeof value === "object") {
      return JSON.stringify(value, Object.getOwnPropertyNames(value))
    }
    return JSON.stringify(value)
  } catch {
    return null
  }
}

const formatErrorMessage = (error: unknown) => {
  if (typeof error === "string") return error
  if (error instanceof Error) {
    if (error.message) return error.message
    const json = safeStringify({
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      ...error,
    })
    return json || String(error)
  }
  if (error && typeof error === "object") {
    return safeStringify(error) || String(error)
  }
  if (typeof error === "number" || typeof error === "boolean") {
    return String(error)
  }
  return "Failed to add token"
}

export function useAddToken(token?: WatchableToken) {
  const { data: walletClient } = useWalletClient()
  const { connector } = useAccount()
  const [isAddingToken, setIsAddingToken] = useState(false)

  const supportsWatchAsset =
    connector?.type === "injected" || connector?.type === "metaMask"
  const canAddToken = !!token && !!walletClient && supportsWatchAsset

  const handleAddToken = useCallback(async () => {
    if (!token || !walletClient) return
    if (!supportsWatchAsset) {
      toastError(
        "Adding tokens is only supported in MetaMask (in-app browser or extension).",
      )
      return
    }

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
        const metaMaskRequest = (
          window as typeof window & {
            ethereum?: { request?: (args: unknown) => Promise<unknown> }
          }
        ).ethereum?.request

        if (metaMaskRequest) {
          try {
            await metaMaskRequest({
              method: "wallet_watchAsset",
              params,
            })
            return
          } catch (error) {
            try {
              await metaMaskRequest({
                method: "wallet_watchAsset",
                params: [params],
              })
              return
            } catch (fallbackError) {
              throw fallbackError ?? error
            }
          }
        }
      }

      await walletClient.watchAsset(params)
    } catch (error) {
      toastError(formatErrorMessage(error))
    } finally {
      setIsAddingToken(false)
    }
  }, [token, walletClient, supportsWatchAsset])

  return { canAddToken, handleAddToken, isAddingToken }
}
