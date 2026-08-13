import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import { fetchExportMarketCatalog } from "@/lib/export/sources/catalog"
import { EXPORT_CHAIN_IDS, ExportChainId } from "@/lib/export/types"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const chainId = Number(request.nextUrl.searchParams.get("chainId"))
  if (!EXPORT_CHAIN_IDS.includes(chainId as ExportChainId)) {
    return NextResponse.json({ error: "Unsupported chain" }, { status: 400 })
  }
  try {
    const markets = await fetchExportMarketCatalog(chainId as ExportChainId)
    const includeBorrowers =
      request.nextUrl.searchParams.get("includeBorrowers") === "true"
    if (!includeBorrowers) {
      return NextResponse.json(
        { markets },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        },
      )
    }

    const activeMarkets = markets.filter(({ isActive }) => isActive)
    const marketAddressesByBorrower = new Map<string, string[]>()
    activeMarkets.forEach(({ address, borrower }) => {
      const borrowerMarkets = marketAddressesByBorrower.get(borrower) ?? []
      borrowerMarkets.push(address)
      marketAddressesByBorrower.set(borrower, borrowerMarkets)
    })
    const activeBorrowerAddresses = [...marketAddressesByBorrower.keys()]
    const borrowerProfiles = await prisma.borrower.findMany({
      where: { chainId },
      select: { address: true, alias: true, name: true },
    })
    const profileByAddress = new Map(
      borrowerProfiles.map((profile) => [
        profile.address.toLowerCase(),
        profile,
      ]),
    )
    const borrowers = activeBorrowerAddresses
      .map((address) => {
        const profile = profileByAddress.get(address)
        return {
          address,
          name: profile?.alias || profile?.name || address,
          marketAddresses: marketAddressesByBorrower.get(address) ?? [],
        }
      })
      .sort((left, right) => left.name.localeCompare(right.name))

    return NextResponse.json(
      { borrowers, markets },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    )
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load markets",
      },
      { status: 500 },
    )
  }
}
