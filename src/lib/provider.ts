import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { createPublicClient, http } from "viem"
import { mainnet, sepolia } from "viem/chains"

import { TargetChainId } from "@/config/network"

import { plasmaMainnet } from "./chains/plasma-mainnet"
import { plasmaTestnet } from "./chains/plasma-testnet"
import { createViemProvider } from "./viem-provider"

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

const resolveServerRpcUrl = (chainId: SupportedChainId) => {
  const serverRpcUrl = process.env[SERVER_RPC_ENV_BY_ID[chainId]]
  if (serverRpcUrl) return serverRpcUrl
  return RPC_URL_BY_ID[chainId].replace(
    "ALCHEMY_API_KEY",
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "",
  )
}

export const getProviderForServer = (
  chainId: SupportedChainId = TargetChainId,
) => {
  const chain = VIEM_CHAIN_BY_ID[chainId]
  const rpcUrl = resolveServerRpcUrl(chainId)

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
  })
  return createViemProvider(client)
}
