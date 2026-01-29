import { useCallback, useMemo } from "react"

import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { BlockExplorerBaseUrl, getBlockExplorerBaseUrl } from "@/config/network"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, "")

const buildUrl = (baseUrl: string, path: string) =>
  `${baseUrl}/${path.replace(/^\/+/, "")}`

export type UseBlockExplorerOptions = {
  chainId?: number
}

export const useBlockExplorer = (options?: UseBlockExplorerOptions) => {
  const { chainId: overrideChainId } = options ?? {}

  const { blockExplorerUrl: selectedExplorerUrl, chainId: targetChainId } =
    useSelectedNetwork()
  const { explorerUrl, chainId: connectedChainId } = useCurrentNetwork()

  const baseUrl = useMemo(() => {
    if (overrideChainId) {
      return normalizeBaseUrl(
        getBlockExplorerBaseUrl(overrideChainId as SupportedChainId),
      )
    }

    const normalizedSelected = selectedExplorerUrl
      ? normalizeBaseUrl(selectedExplorerUrl)
      : undefined

    const chainFromConnection = connectedChainId
      ? getBlockExplorerBaseUrl(connectedChainId as SupportedChainId)
      : undefined

    const normalizedConnection = chainFromConnection
      ? normalizeBaseUrl(chainFromConnection)
      : undefined

    const normalizedExplorerUrl = explorerUrl
      ? normalizeBaseUrl(explorerUrl)
      : undefined

    const fallbackTarget = targetChainId
      ? normalizeBaseUrl(getBlockExplorerBaseUrl(targetChainId))
      : undefined

    return (
      normalizedExplorerUrl ??
      normalizedConnection ??
      normalizedSelected ??
      fallbackTarget ??
      normalizeBaseUrl(BlockExplorerBaseUrl)
    )
  }, [
    overrideChainId,
    selectedExplorerUrl,
    explorerUrl,
    connectedChainId,
    targetChainId,
  ])

  const build = useCallback(
    (path: string) => buildUrl(baseUrl, path),
    [baseUrl],
  )

  const getTxUrl = useCallback((hash: string) => build(`tx/${hash}`), [build])

  const getAddressUrl = useCallback(
    (address: string) => build(`address/${address}`),
    [build],
  )

  const getTokenUrl = useCallback(
    (address: string) => build(`token/${address}`),
    [build],
  )

  return {
    baseUrl,
    buildUrl: build,
    getTxUrl,
    getAddressUrl,
    getTokenUrl,
  }
}
