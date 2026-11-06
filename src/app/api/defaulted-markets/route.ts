import { SubgraphUrls, SupportedChainId } from "@wildcatfi/wildcat-sdk"
// eslint-disable-next-line camelcase
import { unstable_cache } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import { fetchDefaultedMarkets } from "@/utils/defaultedMarkets"

export const runtime = "nodejs"

const CACHE_VERSION = "v2"
// Clients reject snapshots whose source block is 5+ minutes old and fall back
// to scanning the subgraph themselves. Keep server cache + CDN freshness +
// stale-while-revalidate (60 + 30 + 60s) well inside that budget.
const REVALIDATE_SECONDS = 60

const isSupportedChainId = (chainId: number): chainId is SupportedChainId =>
  Object.prototype.hasOwnProperty.call(SubgraphUrls, chainId)

const getCached = (chainId: SupportedChainId) =>
  unstable_cache(
    () => fetchDefaultedMarkets(chainId),
    ["defaultedMarkets", CACHE_VERSION, String(chainId)],
    { revalidate: REVALIDATE_SECONDS },
  )()

export async function GET(req: NextRequest) {
  const chainIdRaw = req.nextUrl.searchParams.get("chainId") ?? ""
  const chainId = /^\d+$/.test(chainIdRaw) ? Number(chainIdRaw) : NaN

  if (!isSupportedChainId(chainId)) {
    return NextResponse.json({ error: "Invalid chainId" }, { status: 400 })
  }

  try {
    const data = await getCached(chainId)
    const res = NextResponse.json(data, { status: 200 })
    res.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60",
    )
    return res
  } catch {
    return NextResponse.json(
      { error: "Default status unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    )
  }
}
