import { NextRequest, NextResponse } from "next/server"

import { CACHE_TTL_MS, FAILURE_BACKOFF_MS } from "@/lib/destinations/constants"
import { getDestinations } from "@/lib/destinations/server/getDestinations"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// force-dynamic alone still lets Next cache POST fetches (subgraph and RPC)
// indefinitely, which would hide new markets and wrappers until the Data Cache
// is purged.
export const fetchCache = "force-no-store"

export async function GET(request: NextRequest) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }

  try {
    const payload = await getDestinations(chainId)
    const stale = payload.stale || payload.stalePlatforms.length > 0
    const maxAgeSec = (stale ? FAILURE_BACKOFF_MS : CACHE_TTL_MS) / 1000
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": stale
          ? `public, s-maxage=${maxAgeSec}`
          : `public, s-maxage=${maxAgeSec}, stale-while-revalidate=60`,
      },
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[Destinations] request failed on chain ${chainId}`, error)
    return NextResponse.json(
      { error: "Destinations are unavailable" },
      { status: 502 },
    )
  }
}
