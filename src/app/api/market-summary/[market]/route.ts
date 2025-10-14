// eslint-disable-next-line camelcase
import { WildcatMarket__factory } from "@wildcatfi/wildcat-sdk/dist/typechain"
import { NextRequest, NextResponse } from "next/server"

import { TargetChainId } from "@/config/network"
import { prisma } from "@/lib/db"
import { getProviderForServer } from "@/lib/provider"
import { getZodParseError } from "@/lib/zod-error"

import { MarketSummary, MarketSummaryDTO } from "./dto"
import { verifyApiToken } from "../../auth/verify-header"

export async function GET(
  request: NextRequest,
  { params }: { params: { market: string } },
) {
  const market = params.market.toLowerCase()
  const marketDescription = await prisma.marketDescription.findFirst({
    where: { marketAddress: market },
  })
  if (!marketDescription) {
    return NextResponse.json(
      { error: "Market description not found" },
      { status: 404 },
    )
  }
  return NextResponse.json({ description: marketDescription.description })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { market: string } },
) {
  const body = await request.json()
  let parsedBody: MarketSummary
  try {
    parsedBody = MarketSummaryDTO.parse({
      marketAddress: params.market.toLowerCase(),
      description: body.description,
    })
  } catch (err) {
    return getZodParseError(err)
  }
  const token = await verifyApiToken(request)
  // eslint-disable-next-line camelcase
  const borrower = await WildcatMarket__factory.connect(
    parsedBody.marketAddress,
    getProviderForServer(),
  )
    .borrower()
    .then((t) => t.toLowerCase())

  if (borrower !== token?.address.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await prisma.marketDescription.upsert({
    where: {
      chainId_marketAddress: {
        chainId: TargetChainId,
        marketAddress: parsedBody.marketAddress,
      },
    },
    create: {
      chainId: TargetChainId,
      marketAddress: parsedBody.marketAddress,
      description: parsedBody.description,
    },
    update: {
      description: parsedBody.description,
    },
  })
  return NextResponse.json({ success: true })
}

/// HEAD /api/market-summary/[market]
/// Route to check if the market description exists.
///
/// Unauthenticated.
export async function HEAD(
  request: NextRequest,
  { params }: { params: { market: string } },
) {
  const market = params.market.toLowerCase()
  const marketDescriptionExists =
    (await prisma.marketDescription.count({
      where: { marketAddress: market },
    })) > 0
  // Return 200 if the market description exists, 404 otherwise
  return new NextResponse(null, {
    status: marketDescriptionExists ? 200 : 404,
  })
}
