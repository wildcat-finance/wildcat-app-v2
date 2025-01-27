import { providers } from "ethers"
import { createPublicClient, http } from "viem"
import { mainnet, sepolia } from "viem/chains"

import { NETWORKS } from "@/config/network"

export const getProviderForServer = () => {
  const [chain, alchemyId] =
    process.env.NEXT_PUBLIC_TARGET_NETWORK === NETWORKS.Sepolia.name
      ? [sepolia, "eth-sepolia"]
      : [mainnet, "eth-mainnet"]
  const rpcUrl =
    process.env.NEXT_RPC_URL ??
    `https://${alchemyId}.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
  const client = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  })
  const { transport } = client
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  const provider = new providers.Web3Provider(transport, network)
  return provider
}
