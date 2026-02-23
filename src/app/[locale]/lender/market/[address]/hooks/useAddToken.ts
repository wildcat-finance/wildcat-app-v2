import { useMutation } from "@tanstack/react-query"
import { getAddress, isAddress, numberToHex } from "viem"
import type { Address, Hex } from "viem"
import { useAccount, useWalletClient } from "wagmi"

import { toastError, toastSuccess } from "@/components/Toasts"

export type NewToken = {
  address: Address | string
  symbol: string
  decimals: number
  image?: string
  chainId?: number
  name?: string
}

type WalletWatchAssetParams = {
  type: "ERC20"
  options: {
    address: Address
    symbol: string
    decimals: number
    image?: string
  }
}

type WalletSwitchEthereumChainParams = [{ chainId: Hex }]

type Eip1193RequestArguments =
  | { method: "wallet_watchAsset"; params: WalletWatchAssetParams }
  | {
      method: "wallet_switchEthereumChain"
      params: WalletSwitchEthereumChainParams
    }
  | { method: "eth_chainId" }
  | { method: string; params?: unknown }

type Eip1193RequestFn = <T = unknown>(
  args: Eip1193RequestArguments,
) => Promise<T>

type Eip1193Provider = { request: Eip1193RequestFn }

type ConnectorLike = {
  getProvider?: () => Promise<unknown>
} | null

type WalletClientLike = {
  request: Eip1193RequestFn
} | null

function isUserRejectedError(err: unknown): boolean {
  const e = err as { code?: unknown; message?: unknown } | null
  const code = typeof e?.code === "number" ? e.code : undefined
  const message = typeof e?.message === "string" ? e.message : ""
  return code === 4001 || /user rejected/i.test(message)
}

function isWatchAssetUnsupported(err: unknown): boolean {
  const e = err as { code?: unknown; message?: unknown } | null
  const code = typeof e?.code === "number" ? e.code : undefined
  const message = typeof e?.message === "string" ? e.message : ""
  return (
    code === -32601 ||
    /wallet_watchAsset|method not found|does not support/i.test(message)
  )
}

function normalizeSymbol(symbol: string): string {
  return String(symbol).trim().slice(0, 11)
}

async function getProviderRequest(
  connector: ConnectorLike,
  walletClient: WalletClientLike,
): Promise<Eip1193RequestFn | null> {
  if (connector?.getProvider) {
    try {
      const provider =
        (await connector.getProvider()) as Partial<Eip1193Provider> | null
      if (provider?.request) return provider.request.bind(provider)
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err)
    }
  }

  if (walletClient?.request) return walletClient.request.bind(walletClient)

  const w =
    typeof window !== "undefined"
      ? (window as unknown as { ethereum?: Partial<Eip1193Provider> })
      : undefined
  if (w?.ethereum?.request) return w.ethereum.request.bind(w.ethereum)

  return null
}

export function useAddToken(token?: NewToken) {
  const { data: walletClient } = useWalletClient()
  const { connector, isConnected } = useAccount()

  const canAddToken = Boolean(
    token && isConnected && (walletClient || connector),
  )

  const {
    mutate: handleAddToken,
    mutateAsync: handleAddTokenAsync,
    isPending: isAddingToken,
    error: addTokenError,
  } = useMutation<boolean, Error, NewToken | undefined>({
    mutationFn: async (overrideToken) => {
      if (!isConnected) throw new Error("Wallet is not connected")

      const t = overrideToken ?? token
      if (!t) throw new Error("Token is not provided")

      if (!isAddress(t.address)) throw new Error("Invalid token address")

      if (!Number.isInteger(t.decimals) || t.decimals < 0 || t.decimals > 255) {
        throw new Error("Invalid token decimals")
      }

      const request = await getProviderRequest(
        connector as unknown as ConnectorLike,
        walletClient as unknown as WalletClientLike,
      )
      if (!request) throw new Error("No EIP-1193 provider available")

      if (typeof t.chainId === "number") {
        const currentHex = await request<string>({ method: "eth_chainId" })
        const current = Number.parseInt(currentHex, 16)

        if (Number.isFinite(current) && current !== t.chainId) {
          await request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: numberToHex(t.chainId) }],
          })
        }
      }

      const params: WalletWatchAssetParams = {
        type: "ERC20",
        options: {
          address: getAddress(t.address),
          symbol: normalizeSymbol(t.symbol),
          decimals: t.decimals,
          ...(t.image ? { image: t.image } : {}),
        },
      }

      try {
        const added = await request<unknown>({
          method: "wallet_watchAsset",
          params,
        })
        return Boolean(added)
      } catch (err) {
        if (isUserRejectedError(err))
          throw new Error("User rejected token add request")
        if (isWatchAssetUnsupported(err))
          throw new Error(
            "wallet_watchAsset is not supported by the connected wallet",
          )
        throw err instanceof Error ? err : new Error(String(err))
      }
    },
    onError: (error: Error) => {
      toastError(error.message)
    },
    onSuccess: () => {
      toastSuccess("Token added successfully")
    },
  })

  return {
    canAddToken,
    handleAddToken,
    handleAddTokenAsync,
    isAddingToken,
    addTokenError,
  }
}
