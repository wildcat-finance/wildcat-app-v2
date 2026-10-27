import { NextRequest, NextResponse } from "next/server"

import { GLASS_DOOR_READ_CHAINS, isAddress, ReadResult } from "./read"

const CACHE = "public, s-maxage=60, stale-while-revalidate=600"

/** Validates the path, then returns the read with publication-keyed caching. */
export async function respond(
  request: NextRequest,
  chain: string,
  address: string,
  read: (chainId: number, address: string) => Promise<ReadResult>,
) {
  const chainId = Number(chain)
  if (!GLASS_DOOR_READ_CHAINS.includes(chainId) || !isAddress(address)) {
    return NextResponse.json(
      { error: "Unsupported chain or address" },
      { status: 400 },
    )
  }
  const result = await read(chainId, address)
  if (result.status !== 200) {
    return NextResponse.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "public, s-maxage=30" },
    })
  }
  // A cached response always belongs to one complete publication; a late
  // purge can only serve an older publication, never a half-written one.
  const etag = `"${result.publicationId}"`
  const headers = { "Cache-Control": CACHE, ETag: etag }
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers })
  }
  return NextResponse.json(result.body, { headers })
}
