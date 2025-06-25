import { useMemo } from "react"

import { JsonRpcSigner } from "@ethersproject/providers"
import { Signer } from "@wildcatfi/wildcat-sdk"
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

import { NETWORKS, TargetChainId } from "@/config/network"

export function clientToSigner(
  client: Client<Transport, Chain, Account>,
): JsonRpcSigner & { chainId: number } {
  const { account, chain, transport } = client
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  const provider = new providers.Web3Provider(transport, network)

  const signer = provider.getSigner(account.address)
  if (!("chainId" in signer)) {
    Object.assign(signer, { chainId: chain.id })
  }
  return signer as JsonRpcSigner & { chainId: number }
}

/** Hook to convert a Viem Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useWalletClient({ chainId })

  return useMemo(() => (client ? clientToSigner(client) : undefined), [client])
}

export function clientToWalletInfo(
  client: WalletClient | (PublicClient & { account?: undefined }),
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

  return {
    provider,
    signer,
    isTestnet: chain?.id === NETWORKS.Sepolia.chainId,
    isWrongNetwork: chain?.id !== TargetChainId,
    address: account?.address,
    chain,
  }
}

type UseEthersProviderResult = {
  provider?: providers.Provider
  signer?: Signer
  address?: string
  isTestnet?: boolean
  isWrongNetwork?: boolean
  chain?: Chain
}

export function useEthersProvider({
  chainId,
}: { chainId?: number } = {}): UseEthersProviderResult {
  const { data: walletClient } = useWalletClient({ chainId })
  const publicClient = usePublicClient({ chainId })
  const client = walletClient ?? publicClient

  return useMemo(() => (client ? clientToWalletInfo(client) : {}), [client])
}
