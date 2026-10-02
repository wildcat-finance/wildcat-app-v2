import { NextRequest, NextResponse } from "next/server"

import { getDestinations } from "@/lib/destinations/server/getDestinations"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }

  try {
    const payload = await getDestinations(chainId)
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": payload.stale
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
