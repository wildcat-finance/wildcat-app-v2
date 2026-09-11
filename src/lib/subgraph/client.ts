import {
  ApolloClient,
  InMemoryCache,
  NormalizedCacheObject,
} from "@apollo/client"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { getBrowserSubgraphUrl } from "./endpoints"

const clients = new Map<SupportedChainId, ApolloClient<NormalizedCacheObject>>()

/**
 * App-owned browser subgraph client, memoised per chain.
 *
 * Mirrors the SDK's `getSubgraphClient` (`new ApolloClient({ cache: new InMemoryCache(), uri })`)
 * but resolves the endpoint through `getBrowserSubgraphUrl` so the fork harness can point it at a
 * local graph-node. SDK 3.1.17 has no `createSubgraphClient` overload that accepts a URL, so the
 * client is constructed here instead.
 */
export const getBrowserSubgraphClient = (
  chainId: SupportedChainId,
): ApolloClient<NormalizedCacheObject> => {
  let client = clients.get(chainId)
  if (!client) {
    client = new ApolloClient({
      cache: new InMemoryCache(),
      uri: getBrowserSubgraphUrl(chainId),
    })
    clients.set(chainId, client)
  }
  return client
}

export type BrowserSubgraphClient = ReturnType<typeof getBrowserSubgraphClient>
