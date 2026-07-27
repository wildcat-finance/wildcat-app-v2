import { NextRequest, NextResponse } from "next/server"
import { isAddress } from "viem"

import { prisma } from "@/lib/db"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

import { LenderMlaStatusResponse } from "./interface"

/// GET /api/mla/lender-status?chainId=<chainId>&market=<address>&lenderAddress=<address>
export async function GET(request: NextRequest) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }

  const markets = Array.from(
    new Set(
      request.nextUrl.searchParams
        .getAll("market")
        .map((market) => market.toLowerCase()),
    ),
  )
  if (markets.length === 0 || markets.some((market) => !isAddress(market))) {
    return NextResponse.json(
      { error: "At least one valid market address is required" },
      { status: 400 },
    )
  }

  const lenderAddress = request.nextUrl.searchParams
    .get("lenderAddress")
    ?.toLowerCase()
  if (lenderAddress && !isAddress(lenderAddress)) {
    return NextResponse.json(
      { error: "Invalid lender address" },
      { status: 400 },
    )
  }

  const [agreements, signatures] = await Promise.all([
    prisma.masterLoanAgreement.findMany({
      where: { chainId, market: { in: markets } },
      select: { market: true },
    }),
    lenderAddress
      ? prisma.mlaSignature.findMany({
          where: {
            chainId,
            market: { in: markets },
            address: lenderAddress,
          },
          select: { market: true },
        })
      : [],
  ])

  const signedMarkets = new Set(
    signatures.map(({ market }) => market.toLowerCase()),
  )
  const response: LenderMlaStatusResponse = {
    requiresSignature: agreements
      .map(({ market }) => market.toLowerCase())
      .filter((market) => !signedMarkets.has(market)),
  }

  return NextResponse.json(response)
}

export const dynamic = "force-dynamic"
