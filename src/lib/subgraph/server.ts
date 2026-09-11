import "server-only"

import { createSubgraphClient, SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { getServerSubgraphUrl } from "./endpoints"

const clients = new Map<
  SupportedChainId,
  ReturnType<typeof createSubgraphClient>
>()

/**
 * Server-side subgraph client for API routes; honours
 * `WILDCAT_SERVER_SUBGRAPH_URL_<NET>`. Memoised per chain.
 */
export const getServerSubgraphClient = (chainId: SupportedChainId) => {
  let client = clients.get(chainId)
  if (!client) {
    client = createSubgraphClient(chainId, getServerSubgraphUrl(chainId))
    clients.set(chainId, client)
  }
  return client
}

export type ServerSubgraphClient = ReturnType<typeof getServerSubgraphClient>
