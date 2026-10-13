import { NextRequest, NextResponse } from "next/server"

import { EDGE_STALE_WHILE_REVALIDATE_SEC } from "@/lib/destinations/constants"
import { getDestinations } from "@/lib/destinations/server/getDestinations"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// force-dynamic alone still lets Next cache POST fetches (subgraph and API)
// indefinitely, which would hide new markets and wrappers until the Data Cache
// is purged.
export const fetchCache = "force-no-store"

export async function GET(request: NextRequest) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }

  try {
    const { payload, refreshAt } = await getDestinations(chainId)
    // The edge keeps the response only until the server would rebuild it, so
    // the two caches never stack. Past that, it serves the old response while
    // it refetches, which keeps the rebuild off the request path.
    const maxAgeSec = Math.max(1, Math.ceil((refreshAt - Date.now()) / 1000))
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${maxAgeSec}, stale-while-revalidate=${EDGE_STALE_WHILE_REVALIDATE_SEC}`,
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
