import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
} from "@apollo/client"
import { mainnet, sepolia } from "wagmi/chains"

// Hinterlight carries the v2.0.25+ analytics entities (BorrowerStats,
// LenderStats, *DailyStats, TokenDailyPrice, Market.*USD). The SDK's
// getSubgraphClient still points at Goldsky, so profile analytics use this
// client directly and leave all other subgraph usage on the SDK path.
const HINTERLIGHT_SUBGRAPH_URLS: Record<number, string> = {
  [mainnet.id]: "https://graph.hinterlight.net/subgraphs/name/mainnet_v2_0_26",
  [sepolia.id]:
    "https://graph.hinterlight.net/subgraphs/name/wildcat_ethereum_sepolia_analytics",
}

const clientCache = new Map<number, ApolloClient<NormalizedCacheObject>>()

export const getHinterlightClient = (
  chainId: number | undefined,
): ApolloClient<NormalizedCacheObject> | undefined => {
  if (chainId === undefined) return undefined
  const url = HINTERLIGHT_SUBGRAPH_URLS[chainId]
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
  chainId !== undefined && chainId in HINTERLIGHT_SUBGRAPH_URLS
