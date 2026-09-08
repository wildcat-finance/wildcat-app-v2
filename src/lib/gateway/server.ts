import "server-only"

import {
  getSubgraphClient,
  type SupportedChainId,
} from "@wildcatfi/wildcat-sdk"

export const getGatewayToken = () => {
  const token = process.env.WILDCAT_GATEWAY_TOKEN
  if (!token || /\s/.test(token)) {
    throw new Error("WILDCAT_GATEWAY_TOKEN is missing or invalid")
  }
  return token
}

export const getServerSubgraphClient = (chainId: SupportedChainId) =>
  getSubgraphClient(chainId, { bearerToken: getGatewayToken() })
