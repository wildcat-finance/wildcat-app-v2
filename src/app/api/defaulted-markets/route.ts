import { SubgraphUrls, SupportedChainId } from "@wildcatfi/wildcat-sdk"
// eslint-disable-next-line camelcase
import { unstable_cache } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import {
  DefaultedMarketsData,
  fetchDefaultedMarkets,
} from "@/utils/defaultedMarkets"

export const runtime = "nodejs"

const CACHE_VERSION = "v2"
const REVALIDATE_SECONDS = 60
const FRESH_WINDOW = 5 * 60_000
const SERVER_MAX_AGE = 200_000
const CLIENT_MARGIN_SECONDS = 60
const MAX_CDN_SECONDS = 30
const UNHEALTHY_CDN_SECONDS = 10

const isSupportedChainId = (chainId: number): chainId is SupportedChainId =>
  Object.prototype.hasOwnProperty.call(SubgraphUrls, chainId)

const getCached = (chainId: SupportedChainId) =>
  unstable_cache(
    () => fetchDefaultedMarkets(chainId),
    ["defaultedMarkets", CACHE_VERSION, String(chainId)],
    { revalidate: REVALIDATE_SECONDS },
  )()

const ageOf = ({ asOfTimestamp }: DefaultedMarketsData) =>
  asOfTimestamp == null ? Infinity : Date.now() - asOfTimestamp * 1000

const latest = new Map<SupportedChainId, DefaultedMarketsData>()
const inFlight = new Map<SupportedChainId, Promise<DefaultedMarketsData>>()

const recompute = (chainId: SupportedChainId) => {
  const pending = inFlight.get(chainId)
  if (pending) return pending
  const request = fetchDefaultedMarkets(chainId)
    .then((data) => {
      latest.set(chainId, data)
      return data
    })
    .finally(() => inFlight.delete(chainId))
  inFlight.set(chainId, request)
  return request
}

const getFresh = async (chainId: SupportedChainId) => {
  const cached = await getCached(chainId)
  const remembered = latest.get(chainId)
  const best =
    remembered && ageOf(remembered) < ageOf(cached) ? remembered : cached
  const age = ageOf(best)
  if (Number.isFinite(age) && age > SERVER_MAX_AGE) return recompute(chainId)
  return best
}

const cacheControl = (data: DefaultedMarketsData) => {
  const remaining =
    Math.floor((FRESH_WINDOW - ageOf(data)) / 1000) - CLIENT_MARGIN_SECONDS
  const seconds =
    remaining > 0 ? Math.min(remaining, MAX_CDN_SECONDS) : UNHEALTHY_CDN_SECONDS
  return `public, s-maxage=${seconds}`
}

export async function GET(req: NextRequest) {
  const chainIdRaw = req.nextUrl.searchParams.get("chainId") ?? ""
  const chainId = /^\d+$/.test(chainIdRaw) ? Number(chainIdRaw) : NaN

  if (!isSupportedChainId(chainId)) {
    return NextResponse.json({ error: "Invalid chainId" }, { status: 400 })
  }

  try {
    const data = await getFresh(chainId)
    const res = NextResponse.json(data, { status: 200 })
    res.headers.set("Cache-Control", cacheControl(data))
    return res
  } catch {
    return NextResponse.json(
      { error: "Default status unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    )
  }
}
