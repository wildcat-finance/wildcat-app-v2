import { useMemo } from "react"

import { JsonRpcSigner } from "@ethersproject/providers"
import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
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

/** Hook to convert a Viem Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useWalletClient({ chainId })

  return useMemo(() => (client ? clientToSigner(client) : undefined), [client])
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

type UseEthersProviderResult = {
  provider?: providers.Provider
  signer?: JsonRpcSignerWithChainId
  address?: string
  isTestnet?: boolean
  isWrongNetwork?: boolean
  chain?: Chain
  chainId?: number
  targetChainId: number
  hasV1Deployment?: boolean
}

/**
 * Returns a provider for the selected network, first using the connected wallet, then the
 * public client if no wallet is connected.
 */
export function useEthersProvider({
  chainId,
}: { chainId?: number } = {}): UseEthersProviderResult {
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

  const client = walletClientForChain ?? publicClient

  return useMemo(
    () =>
      client?.chain
        ? clientToWalletInfo(client, effectiveChainId)
        : { targetChainId: effectiveChainId },
    [client, effectiveChainId],
  )
}
