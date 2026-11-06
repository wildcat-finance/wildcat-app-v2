import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { providers } from "ethers"
import { Chain, createPublicClient, http } from "viem"
import { mainnet, sepolia } from "viem/chains"

import { plasmaMainnet } from "./chains/plasma-mainnet"
import { plasmaTestnet } from "./chains/plasma-testnet"

const VIEM_CHAIN_BY_ID: Partial<Record<SupportedChainId, Chain>> = {
  [SupportedChainId.Sepolia]: sepolia,
  [SupportedChainId.Mainnet]: mainnet,
  [SupportedChainId.PlasmaTestnet]: plasmaTestnet,
  [SupportedChainId.PlasmaMainnet]: plasmaMainnet,
}

const RPC_URL_BY_ID: Partial<Record<SupportedChainId, string>> = {
  [SupportedChainId.Sepolia]:
    "https://eth-sepolia.g.alchemy.com/v2/ALCHEMY_API_KEY",
  [SupportedChainId.Mainnet]:
    "https://eth-mainnet.g.alchemy.com/v2/ALCHEMY_API_KEY",
  [SupportedChainId.PlasmaTestnet]: "https://testnet-rpc.plasma.to",
  [SupportedChainId.PlasmaMainnet]: "https://rpc.plasma.to",
}

export const getProviderForServer = (chainId: SupportedChainId) => {
  const chain = VIEM_CHAIN_BY_ID[chainId]
  const rpcUrlTemplate = RPC_URL_BY_ID[chainId]
  if (!chain || !rpcUrlTemplate) {
    throw new Error(`Chain ${chainId} is not configured`)
  }
  const rpcUrl = rpcUrlTemplate.replace(
    "ALCHEMY_API_KEY",
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "",
  )

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
  })
  const { account, transport } = client
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: (
      chain.contracts as { ensRegistry?: { address: string } } | undefined
    )?.ensRegistry?.address,
  }
  const provider = new providers.Web3Provider(transport, network)
  return provider
}
