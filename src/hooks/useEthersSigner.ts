import { useMemo } from "react"

import { JsonRpcSigner } from "@ethersproject/providers"
import {
  asWildcatWriteClient,
  isSupportedChainId,
  type WildcatClient,
  type WildcatWriteClient,
} from "@wildcatfi/wildcat-sdk"
import { providers } from "ethers"
import type {
  Account,
  Chain,
  Client,
  Transport,
  WalletClient,
  PublicClient,
} from "viem"
import { useWalletClient, usePublicClient } from "wagmi"

import { NetworkInfo, NETWORKS_BY_ID } from "@/config/network"
import { useAppSelector } from "@/store/hooks"

export type JsonRpcSignerWithChainId = JsonRpcSigner & { chainId: number }

export function clientToSigner(
  client: Client<Transport, Chain, Account>,
): JsonRpcSignerWithChainId {
  const { account, chain, transport } = client
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  const provider = new providers.Web3Provider(transport, network)

  const signer = provider.getSigner(account.address)
  if (!("chainId" in signer) || signer.chainId !== chain.id) {
    Object.assign(signer, { chainId: chain.id })
  }
  return signer as JsonRpcSignerWithChainId
}

export function clientToWalletInfo(
  client: WalletClient | (PublicClient & { account?: undefined }),
  targetChainId: number,
) {
  const { account, chain, transport } = client

  if (!chain) {
    throw Error("No network provided")
  }

  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }

  const provider = new providers.Web3Provider(transport, network)
  const signer =
    provider instanceof providers.JsonRpcProvider && account
      ? provider.getSigner(account.address)
      : undefined

  if (signer && (!("chainId" in signer) || signer.chainId !== chain.id)) {
    Object.assign(signer, { chainId: chain.id })
  }
  const networkInfo = isSupportedChainId(chain.id)
    ? (NETWORKS_BY_ID[chain.id as keyof typeof NETWORKS_BY_ID] as NetworkInfo)
    : undefined

  return {
    provider,
    signer: signer as JsonRpcSignerWithChainId,
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
  provider?: providers.Provider
  signer?: JsonRpcSignerWithChainId
}

/**
 * Returns the selected-network viem clients used by SDK 4. Compatibility
 * ethers wrappers should derive from this hook instead of reading wagmi
 * clients independently.
 */
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

/** Hook to convert a Viem Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { walletClient } = useWildcatClient({ chainId })

  return useMemo(
    () =>
      walletClient?.account && walletClient.chain
        ? clientToSigner(walletClient as Client<Transport, Chain, Account>)
        : undefined,
    [walletClient],
  )
}

/**
 * Returns a provider for the selected network, first using the connected wallet, then the
 * public client if no wallet is connected.
 */
export function useEthersProvider({
  chainId,
}: { chainId?: number } = {}): UseEthersProviderResult {
  const wildcatClientInfo = useWildcatClient({ chainId })
  const { publicClient, walletClient, targetChainId } = wildcatClientInfo
  const client = walletClient ?? publicClient
  return useMemo(
    () =>
      client?.chain
        ? {
            ...wildcatClientInfo,
            ...clientToWalletInfo(client, targetChainId),
          }
        : wildcatClientInfo,
    [client, targetChainId, wildcatClientInfo],
  )
}
