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

import { NETWORKS } from "@/config/network"
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
  targetChainId?: number,
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
    isWrongNetwork: chain?.id !== targetChainId,
    address: account?.address,
    chain,
    chainId: chain?.id,
    targetChainId,
  }
}

type UseEthersProviderResult = {
  provider?: providers.Provider
  signer?: Signer
  address?: string
  isTestnet?: boolean
  isWrongNetwork?: boolean
  chain?: Chain
  chainId?: number
  targetChainId?: number
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
  const { data: walletClient } = useWalletClient({ chainId: targetChainId })
  const publicClient = usePublicClient({ chainId: targetChainId })
  console.log(
    `useEthersProvider | ${chainId} | target: ${targetChainId} | walletClient [${
      walletClient ? "x" : " "
    }] | publicClient [${publicClient ? "x" : " "}] (${publicClient?.chain
      .id})`,
  )
  const client = walletClient ?? publicClient

  return useMemo(
    () => (client ? clientToWalletInfo(client, targetChainId) : {}),
    [client],
  )
}
