import { useMemo } from "react"

import {
  asWildcatWriteClient,
  isSupportedChainId,
  type WildcatClient,
  type WildcatWriteClient,
} from "@wildcatfi/wildcat-sdk"
import type { Chain, PublicClient, WalletClient } from "viem"
import { usePublicClient, useWalletClient } from "wagmi"

import { NetworkInfo, NETWORKS_BY_ID } from "@/config/network"
import {
  createViemProvider,
  createViemSigner,
  type ViemProviderLike,
  type ViemSignerWithChainId,
} from "@/lib/viem-provider"
import { useAppSelector } from "@/store/hooks"

// Compatibility alias while the remaining app call sites are migrated by name.
export type JsonRpcSignerWithChainId = ViemSignerWithChainId

export function clientToSigner({
  walletClient,
  publicClient,
}: {
  walletClient: WalletClient
  publicClient: PublicClient
}): JsonRpcSignerWithChainId | undefined {
  return createViemSigner({ walletClient, publicClient })
}

export function clientToWalletInfo(
  client: WalletClient | PublicClient,
  targetChainId: number,
  publicClient: PublicClient,
) {
  const { account, chain } = client as WalletClient
  const signer =
    account && chain
      ? createViemSigner({ walletClient: client as WalletClient, publicClient })
      : undefined
  const provider = createViemProvider(publicClient)
  const networkInfo =
    chain?.id && isSupportedChainId(chain.id)
      ? (NETWORKS_BY_ID[chain.id as keyof typeof NETWORKS_BY_ID] as NetworkInfo)
      : undefined

  return {
    provider,
    signer,
    isTestnet: networkInfo?.isTestnet,
    isWrongNetwork: chain?.id !== targetChainId,
    address: account?.address,
    chain,
    chainId: chain?.id,
    targetChainId,
    hasV1Deployment: networkInfo?.hasV1Deployment,
  }
}

type NetworkClientInfo = {
  address?: string
  isTestnet?: boolean
  isWrongNetwork?: boolean
  chain?: Chain
  chainId?: number
  targetChainId: number
  hasV1Deployment?: boolean
}

type UseWildcatClientResult = NetworkClientInfo & {
  publicClient?: PublicClient
  walletClient?: WalletClient
  wildcatClient?: WildcatClient
  wildcatWriteClient?: WildcatWriteClient
}

type UseEthersProviderResult = UseWildcatClientResult & {
  provider?: ViemProviderLike
  signer?: JsonRpcSignerWithChainId
}

export function useWildcatClient({
  chainId,
}: { chainId?: number } = {}): UseWildcatClientResult {
  const { chainId: targetChainId } = useAppSelector(
    (state) => state.selectedNetwork,
  )

  const effectiveChainId = chainId || targetChainId

  const { data: walletClient } = useWalletClient({
    chainId: effectiveChainId,
  })
  const publicClient = usePublicClient({
    chainId: effectiveChainId,
  })

  const walletClientForChain =
    walletClient?.chain &&
    (typeof effectiveChainId !== "number" ||
      walletClient.chain.id === effectiveChainId)
      ? walletClient
      : undefined

  return useMemo(() => {
    const client = walletClientForChain ?? publicClient
    const networkInfo =
      client?.chain && isSupportedChainId(client.chain.id)
        ? (NETWORKS_BY_ID[
            client.chain.id as keyof typeof NETWORKS_BY_ID
          ] as NetworkInfo)
        : undefined
    const address = walletClientForChain?.account?.address
    const wildcatClient = publicClient
      ? ({
          publicClient,
          walletClient: walletClientForChain,
          account: address,
        } as WildcatClient)
      : undefined

    return {
      publicClient,
      walletClient: walletClientForChain,
      wildcatClient,
      wildcatWriteClient: wildcatClient
        ? asWildcatWriteClient(wildcatClient)
        : undefined,
      isTestnet: networkInfo?.isTestnet,
      isWrongNetwork: client?.chain
        ? client.chain.id !== targetChainId
        : undefined,
      address,
      chain: client?.chain,
      chainId: client?.chain?.id,
      targetChainId,
      hasV1Deployment: networkInfo?.hasV1Deployment,
    }
  }, [publicClient, targetChainId, walletClientForChain])
}

export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { walletClient, publicClient } = useWildcatClient({ chainId })

  return useMemo(
    () =>
      walletClient?.account && walletClient.chain && publicClient
        ? clientToSigner({ walletClient, publicClient })
        : undefined,
    [publicClient, walletClient],
  )
}

export function useEthersProvider({
  chainId,
}: { chainId?: number } = {}): UseEthersProviderResult {
  const wildcatClientInfo = useWildcatClient({ chainId })
  const { publicClient, walletClient, targetChainId } = wildcatClientInfo
  const client = walletClient ?? publicClient
  return useMemo(
    () =>
      client?.chain && publicClient
        ? {
            ...wildcatClientInfo,
            ...clientToWalletInfo(client, targetChainId, publicClient),
          }
        : wildcatClientInfo,
    [client, publicClient, targetChainId, wildcatClientInfo],
  )
}
