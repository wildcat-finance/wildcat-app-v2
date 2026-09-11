import { createSubgraphClient, SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { getBrowserSubgraphUrl } from "./endpoints"

const clients = new Map<
  SupportedChainId,
  ReturnType<typeof createSubgraphClient>
>()

/**
 * App-owned browser subgraph client: the SDK's Apollo client pointed at the
 * env-configured endpoint, memoised per chain.
 */
export const getBrowserSubgraphClient = (chainId: SupportedChainId) => {
  let client = clients.get(chainId)
  if (!client) {
    client = createSubgraphClient(chainId, getBrowserSubgraphUrl(chainId))
    clients.set(chainId, client)
  }
  return client
}

export type BrowserSubgraphClient = ReturnType<typeof getBrowserSubgraphClient>
