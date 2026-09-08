import "server-only"

import { getRpcConnection, SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { createPublicClient, http } from "viem"
import { mainnet, sepolia } from "viem/chains"

import { TargetChainId } from "@/config/network"

import { plasmaMainnet } from "./chains/plasma-mainnet"
import { plasmaTestnet } from "./chains/plasma-testnet"
import { getGatewayToken } from "./gateway/server"
import { createViemProvider } from "./viem-provider"

const VIEM_CHAIN_BY_ID = {
  [SupportedChainId.Sepolia]: sepolia,
  [SupportedChainId.Mainnet]: mainnet,
  [SupportedChainId.PlasmaTestnet]: plasmaTestnet,
  [SupportedChainId.PlasmaMainnet]: plasmaMainnet,
}

const SERVER_RPC_ENV_BY_ID = {
  [SupportedChainId.Sepolia]: "WILDCAT_SERVER_RPC_URL_SEPOLIA",
  [SupportedChainId.Mainnet]: "WILDCAT_SERVER_RPC_URL_MAINNET",
  [SupportedChainId.PlasmaTestnet]: "WILDCAT_SERVER_RPC_URL_PLASMA_TESTNET",
  [SupportedChainId.PlasmaMainnet]: "WILDCAT_SERVER_RPC_URL_PLASMA_MAINNET",
}

export const getViemPublicClientForServer = (
  chainId: SupportedChainId = TargetChainId,
) => {
  const chain = VIEM_CHAIN_BY_ID[chainId]
  const endpoint = process.env[SERVER_RPC_ENV_BY_ID[chainId]]
  // A custom provider may carry its own credentials. Never send it our gateway token.
  const { url, headers, timeout } = getRpcConnection(chainId, {
    ...(endpoint ? { endpoint } : { bearerToken: getGatewayToken() }),
  })

  return createPublicClient({
    chain,
    transport: http(url, {
      timeout,
      fetchOptions: { headers, redirect: "error" },
    }),
  })
}

export const getProviderForServer = (
  chainId: SupportedChainId = TargetChainId,
) => createViemProvider(getViemPublicClientForServer(chainId))
