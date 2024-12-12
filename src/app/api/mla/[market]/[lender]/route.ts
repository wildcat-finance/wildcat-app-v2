import { NextRequest, NextResponse } from "next/server"

import { TargetChainId } from "@/config/network"
import { prisma } from "@/lib/db"

import { MlaSignatureResponse } from "../../interface"

export async function GET(
  request: NextRequest,
  { params }: { params: { market: string; lender: string } },
) {
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
      chainId: TargetChainId,
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
