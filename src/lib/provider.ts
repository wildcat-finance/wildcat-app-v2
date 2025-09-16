import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { providers } from "ethers"
import { createPublicClient, http } from "viem"
import { mainnet, sepolia } from "viem/chains"

const ALCHEMY_NETWORK_BY_ID = {
  [SupportedChainId.Sepolia]: "eth-sepolia",
  [SupportedChainId.Mainnet]: "eth-mainnet",
}

const VIEM_CHAIN_BY_ID = {
  [SupportedChainId.Sepolia]: sepolia,
  [SupportedChainId.Mainnet]: mainnet,
}

export const getProviderForServer = (chainId: SupportedChainId) => {
  const chain = VIEM_CHAIN_BY_ID[chainId]
  const alchemyId = ALCHEMY_NETWORK_BY_ID[chainId]
  const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
  const rpcUrl = alchemyKey
    ? `https://${alchemyId}.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
    : process.env.NEXT_RPC_URL
  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
  })
  const { account, transport } = client
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  const provider = new providers.Web3Provider(transport, network)
  return provider
}
