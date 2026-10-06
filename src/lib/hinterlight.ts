import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
} from "@apollo/client"
import { SubgraphUrls } from "@wildcatfi/wildcat-sdk"
import { mainnet, sepolia } from "wagmi/chains"

// Keep the existing analytics client API and no-cache policy, while sharing
// the SDK's Goldsky endpoints. Analytics remain enabled on Mainnet and Sepolia.
const ANALYTICS_SUBGRAPH_URLS: Record<number, string> = {
  [mainnet.id]: SubgraphUrls[mainnet.id],
  [sepolia.id]: SubgraphUrls[sepolia.id],
}

const clientCache = new Map<number, ApolloClient<NormalizedCacheObject>>()

export const getHinterlightClient = (
  chainId: number | undefined,
): ApolloClient<NormalizedCacheObject> | undefined => {
  if (chainId === undefined) return undefined
  const url = ANALYTICS_SUBGRAPH_URLS[chainId]
  if (!url) return undefined

  const existing = clientCache.get(chainId)
  if (existing) return existing

  const client = new ApolloClient({
    link: new HttpLink({ uri: url }),
    cache: new InMemoryCache(),
    defaultOptions: {
      query: { fetchPolicy: "no-cache", errorPolicy: "none" },
      watchQuery: { fetchPolicy: "no-cache", errorPolicy: "none" },
    },
  })
  clientCache.set(chainId, client)
  return client
}

export const isHinterlightSupported = (chainId: number | undefined): boolean =>
  chainId !== undefined && chainId in ANALYTICS_SUBGRAPH_URLS
