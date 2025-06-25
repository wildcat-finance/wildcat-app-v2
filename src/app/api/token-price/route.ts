import { NextRequest, NextResponse } from "next/server"

import { fetchCoingeckoTokenPrices } from "./coingecko"
import { fetchMoralisTokenPrices } from "./moralis"

// Cache token prices for 5 minutes
export const revalidate = 300

/**
 * Queries Coingecko for token prices and uses Moralis as a fallback
 * for any tokens that are not available on Coingecko.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokens = searchParams.get("tokens")?.split(",")
  if (!tokens) {
    return NextResponse.json({ error: "No tokens provided" }, { status: 400 })
  }

  const prices = await fetchCoingeckoTokenPrices(tokens)
  const missingTokens = tokens.filter((t) => !prices[t.toLowerCase()])
  const moralisPrices = await fetchMoralisTokenPrices(missingTokens)
  return NextResponse.json({
    ...prices,
    ...moralisPrices,
  })
}
