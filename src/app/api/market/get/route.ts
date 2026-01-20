import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
} from "@apollo/client"
import { SubgraphUrls } from "@wildcatfi/wildcat-sdk"
import {
  GetMarketDocument,
  SubgraphGetMarketQuery,
  SubgraphGetMarketQueryVariables,
} from "@wildcatfi/wildcat-sdk/dist/gql/graphql"
// eslint-disable-next-line camelcase
import { unstable_cache } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

type SupportedChainId = keyof typeof SubgraphUrls

const CLIENT_CACHE = new Map<
  SupportedChainId,
  ApolloClient<NormalizedCacheObject>
>()

function isSupportedChainId(chainId: number): chainId is SupportedChainId {
  return Object.prototype.hasOwnProperty.call(SubgraphUrls, chainId)
}

function getClient(chainId: SupportedChainId) {
  const cached = CLIENT_CACHE.get(chainId)
  if (cached) return cached

  const uri = SubgraphUrls[chainId]
  const client = new ApolloClient<NormalizedCacheObject>({
    link: new HttpLink({ uri }),
    cache: new InMemoryCache(),
  })
  CLIENT_CACHE.set(chainId, client)
  return client
}

const DISCOVERY_CHAIN_IDS: SupportedChainId[] = Object.keys(SubgraphUrls)
  .map((k) => Number(k))
  .filter(
    (n): n is SupportedChainId => Number.isFinite(n) && isSupportedChainId(n),
  )

async function fetchMarketFromChain(
  addressLower: string,
  chainId: SupportedChainId,
) {
  const client = getClient(chainId)
  const res = await client.query<
    SubgraphGetMarketQuery,
    SubgraphGetMarketQueryVariables
  >({
    query: GetMarketDocument,
    variables: { market: addressLower },
    fetchPolicy: "network-only",
  })
  return res.data.market ?? null
}

async function findMarketAcrossChains(addressLower: string) {
  const probes = DISCOVERY_CHAIN_IDS.map(async (chainId) => {
    try {
      const market = await fetchMarketFromChain(addressLower, chainId)
      return market ? { chainId, market } : null
    } catch {
      return null
    }
  })

  const results = await Promise.all(probes)
  return (
    results.find(
      (
        x,
      ): x is {
        chainId: SupportedChainId
        market: NonNullable<SubgraphGetMarketQuery["market"]>
      } => !!x,
    ) ?? null
  )
}

const getCached = (addressLower: string, chainIdParam?: SupportedChainId) =>
  unstable_cache(
    async () => {
      if (chainIdParam) {
        const market = await fetchMarketFromChain(addressLower, chainIdParam)
        return market ? { chainId: chainIdParam, market } : null
      }
      return findMarketAcrossChains(addressLower)
    },
    [
      "marketGet",
      addressLower,
      chainIdParam ? String(chainIdParam) : "discover",
    ],
    { revalidate: 60 * 60 * 24 },
  )()

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const address = url.searchParams.get("address")?.toLowerCase()
  const chainIdRaw = url.searchParams.get("chainId")

  if (!address || !/^0x[a-f0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 })
  }

  let chainIdParam: SupportedChainId | undefined
  if (chainIdRaw && /^\d+$/.test(chainIdRaw)) {
    const n = Number(chainIdRaw)
    if (isSupportedChainId(n)) chainIdParam = n
  }

  const found = await getCached(address, chainIdParam)

  const res = NextResponse.json(
    found
      ? { chainId: found.chainId, market: found.market }
      : { chainId: null, market: null },
    { status: 200 },
  )

  // CDN cache: 24h, stale 7d
  res.headers.set(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=604800",
  )
  return res
}
