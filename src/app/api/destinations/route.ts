import { NextRequest, NextResponse } from "next/server"

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
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control":
          payload.stale || payload.stalePlatforms.length > 0
            ? "public, s-maxage=60"
            : "public, s-maxage=300, stale-while-revalidate=60",
      },
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to load destinations", error)
    return NextResponse.json(
      { error: "Destinations are unavailable" },
      { status: 502 },
    )
  }
}
