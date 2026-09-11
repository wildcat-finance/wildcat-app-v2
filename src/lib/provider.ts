import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { providers } from "ethers"
import { createPublicClient, http } from "viem"
import { mainnet, sepolia } from "viem/chains"

import { plasmaMainnet } from "./chains/plasma-mainnet"
import { plasmaTestnet } from "./chains/plasma-testnet"

const VIEM_CHAIN_BY_ID = {
  [SupportedChainId.Sepolia]: sepolia,
  [SupportedChainId.Mainnet]: mainnet,
  [SupportedChainId.PlasmaTestnet]: plasmaTestnet,
  [SupportedChainId.PlasmaMainnet]: plasmaMainnet,
}

const RPC_URL_BY_ID = {
  [SupportedChainId.Sepolia]:
    "https://eth-sepolia.g.alchemy.com/v2/ALCHEMY_API_KEY",
  [SupportedChainId.Mainnet]:
    "https://eth-mainnet.g.alchemy.com/v2/ALCHEMY_API_KEY",
  [SupportedChainId.PlasmaTestnet]: "https://testnet-rpc.plasma.to",
  [SupportedChainId.PlasmaMainnet]: "https://rpc.plasma.to",
}

const SERVER_RPC_ENV_BY_ID = {
  [SupportedChainId.Sepolia]: "WILDCAT_SERVER_RPC_URL_SEPOLIA",
  [SupportedChainId.Mainnet]: "WILDCAT_SERVER_RPC_URL_MAINNET",
  [SupportedChainId.PlasmaTestnet]: "WILDCAT_SERVER_RPC_URL_PLASMA_TESTNET",
  [SupportedChainId.PlasmaMainnet]: "WILDCAT_SERVER_RPC_URL_PLASMA_MAINNET",
}

/**
 * Server-side RPC endpoint for a chain. `WILDCAT_SERVER_RPC_URL_<NET>` lets the fork harness point
 * API routes at the local anvil; with no override set this is the production Alchemy URL.
 */
const resolveServerRpcUrl = (chainId: SupportedChainId) => {
  const serverRpcUrl = process.env[SERVER_RPC_ENV_BY_ID[chainId]]
  if (serverRpcUrl) return serverRpcUrl
  return RPC_URL_BY_ID[chainId].replace(
    "ALCHEMY_API_KEY",
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "",
  )
}

export const getProviderForServer = (chainId: SupportedChainId) => {
  const chain = VIEM_CHAIN_BY_ID[chainId]
  const rpcUrl = resolveServerRpcUrl(chainId)

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
