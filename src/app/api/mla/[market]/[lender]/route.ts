import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

import { MlaSignatureResponse } from "../../interface"

/// GET /api/mla/[market]/[lender]?chainId=<chainId>
export async function GET(
  request: NextRequest,
  { params }: { params: { market: string; lender: string } },
) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const lenderAddress = params.lender.toLowerCase()
  const marketAddress = params.market.toLowerCase()
  if (!lenderAddress || !marketAddress) {
    return NextResponse.json(
      { error: "Lender address is required" },
      { status: 400 },
    )
  }
  const mlaSignature = await prisma.mlaSignature.findFirst({
    where: {
      chainId,
      address: lenderAddress,
      market: marketAddress,
    },
  })
  if (!mlaSignature) {
    return NextResponse.json(
      { error: "MLA signature not found" },
      { status: 404 },
    )
  }
  const { blockNumber, ...rest } = mlaSignature
  return NextResponse.json({
    ...rest,
    blockNumber: blockNumber || undefined,
  } as MlaSignatureResponse)
}
