import "server-only"

import {
  ApolloClient,
  InMemoryCache,
  NormalizedCacheObject,
} from "@apollo/client"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { getServerSubgraphUrl } from "./endpoints"

const clients = new Map<SupportedChainId, ApolloClient<NormalizedCacheObject>>()

/**
 * Server-side subgraph client for API routes; honours
 * `WILDCAT_SERVER_SUBGRAPH_URL_<NET>`. Memoised per chain.
 */
export const getServerSubgraphClient = (
  chainId: SupportedChainId,
): ApolloClient<NormalizedCacheObject> => {
  let client = clients.get(chainId)
  if (!client) {
    client = new ApolloClient({
      cache: new InMemoryCache(),
      uri: getServerSubgraphUrl(chainId),
    })
    clients.set(chainId, client)
  }
  return client
}

export type ServerSubgraphClient = ReturnType<typeof getServerSubgraphClient>
