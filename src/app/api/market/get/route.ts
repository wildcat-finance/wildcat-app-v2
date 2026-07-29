import { gql } from "@apollo/client"
import { getSubgraphClient, SubgraphUrls } from "@wildcatfi/wildcat-sdk"
// eslint-disable-next-line camelcase
import { unstable_cache } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

type SupportedChainId = keyof typeof SubgraphUrls

type MarketDiscoveryQuery = {
  market: { id: string } | null
}

type MarketDiscoveryQueryVariables = {
  market: string
}

const MARKET_DISCOVERY_QUERY = gql`
  query MarketDiscovery($market: ID!) {
    market(id: $market) {
      id
    }
  }
`

function isSupportedChainId(chainId: number): chainId is SupportedChainId {
  return Object.prototype.hasOwnProperty.call(SubgraphUrls, chainId)
}

const DISCOVERY_CHAIN_IDS: SupportedChainId[] = Object.keys(SubgraphUrls)
  .map((k) => Number(k))
  .filter(
    (n): n is SupportedChainId => Number.isFinite(n) && isSupportedChainId(n),
  )

const MARKET_DISCOVERY_CACHE_VERSION = "marketGet:v4"
const MARKET_DISCOVERY_HIT_CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=604800"
const MARKET_DISCOVERY_MISS_CACHE_CONTROL =
  "public, s-maxage=60, stale-while-revalidate=300"

async function fetchMarketFromChain(
  addressLower: string,
  chainId: SupportedChainId,
) {
  const client = getSubgraphClient(chainId)
  const res = await client.query<
    MarketDiscoveryQuery,
    MarketDiscoveryQueryVariables
  >({
    query: MARKET_DISCOVERY_QUERY,
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
        market: NonNullable<MarketDiscoveryQuery["market"]>
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
      MARKET_DISCOVERY_CACHE_VERSION,
      addressLower,
      chainIdParam ? String(chainIdParam) : "discover",
      DISCOVERY_CHAIN_IDS.join(","),
    ],
    { revalidate: 60 },
  )()

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const address = url.searchParams.get("address")?.toLowerCase()
  const chainIdRaw = url.searchParams.get("chainId")

  if (!address || !/^0x[a-f0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 })
  }

  let chainIdParam: SupportedChainId | undefined
  if (chainIdRaw) {
    if (!/^\d+$/.test(chainIdRaw)) {
      return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
    }

    const n = Number(chainIdRaw)
    if (!isSupportedChainId(n)) {
      return NextResponse.json(
        { error: "Unsupported chain ID" },
        { status: 400 },
      )
    }
    chainIdParam = n
  }

  const found = await getCached(address, chainIdParam)

  const res = NextResponse.json(
    found
      ? { chainId: found.chainId, market: found.market }
      : { chainId: null, market: null },
    { status: 200 },
  )

  res.headers.set(
    "Cache-Control",
    found
      ? MARKET_DISCOVERY_HIT_CACHE_CONTROL
      : MARKET_DISCOVERY_MISS_CACHE_CONTROL,
  )
  return res
}
