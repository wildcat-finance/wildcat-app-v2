import {
  getSubgraphClient,
  type SupportedChainId,
} from "@wildcatfi/wildcat-sdk"

export const getRpcProxyUrl = (chainId: SupportedChainId) =>
  `/api/gateway/rpc/${chainId}`

export const getSubgraphProxyUrl = (chainId: SupportedChainId) =>
  `/api/gateway/graph/${chainId}`

// This module is also evaluated during SSR. Credentials belong in server.ts.
export const getAppSubgraphClient = (chainId: SupportedChainId) =>
  getSubgraphClient(chainId, { endpoint: getSubgraphProxyUrl(chainId) })
