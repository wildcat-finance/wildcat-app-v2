import { SubgraphUrls, SupportedChainId } from "@wildcatfi/wildcat-sdk"
// eslint-disable-next-line camelcase
import { unstable_cache } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import { fetchDefaultedMarkets } from "@/utils/defaultedMarkets"

export const runtime = "nodejs"

const CACHE_VERSION = "v2"
const REVALIDATE_SECONDS = 120

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
      "public, s-maxage=60, stale-while-revalidate=240",
    )
    return res
  } catch {
    return NextResponse.json(
      { error: "Default status unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    )
  }
}
