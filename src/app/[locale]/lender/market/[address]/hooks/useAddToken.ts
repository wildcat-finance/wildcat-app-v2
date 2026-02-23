import { useMutation } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { useAccount, useWalletClient } from "wagmi"

import { toastSuccess } from "@/components/Toasts"
import { COLORS } from "@/theme/colors"

type NewToken = {
  address: string
  name: string
  symbol: string
  decimals: number
}

type EIP1193Provider = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>
}

const SUPPORTED_CONNECTOR_TYPES = ["injected", "walletConnect"]

const TOAST_STYLE = {
  borderRadius: "24px",
  background: COLORS.blackRock,
  color: COLORS.white,
  fontFamily: "Roboto, sans-serif",
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>
    if (typeof e.message === "string") return e.message
    // Full JSON dump for unknown shapes — useful for debugging
    try {
      return JSON.stringify(e)
    } catch {
      return String(err)
    }
  }
  return String(err)
}

export function useAddToken(token?: NewToken) {
  const { connector } = useAccount()

  const canAddToken =
    !!token &&
    !!connector?.type &&
    SUPPORTED_CONNECTOR_TYPES.includes(connector.type)

  const { mutate: handleAddToken, isPending: isAddingToken } = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("No token provided")
      if (!connector) throw new Error("No connector")

      const { address, symbol, decimals, name } = token

      const options = {
        address: String(address),
        symbol: String(symbol),
        decimals: Number(decimals),
        name: String(name),
      }

      if (connector.type === "walletConnect") {
        await navigator.clipboard?.writeText(options.address).catch(() => {})
        toastSuccess(
          `Token address copied! Open MetaMask → Import tokens → paste address to add ${symbol}.`,
        )
        return
      }

      const provider = (await connector.getProvider()) as
        | EIP1193Provider
        | undefined

      if (!provider) throw new Error("Provider not available")

      await toast.promise(
        provider.request({
          method: "wallet_watchAsset",
          params: { type: "ERC20", options },
        }),
        {
          loading: `Adding ${symbol} to wallet...`,
          success: `${symbol} added to wallet`,
          error: (err: unknown) =>
            `Failed to add token: ${getErrorMessage(err)}`,
        },
        { style: TOAST_STYLE },
      )
    },
  })

  return { canAddToken, handleAddToken, isAddingToken }
}
