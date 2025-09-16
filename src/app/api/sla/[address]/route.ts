import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

/// GET /api/sla/[address]?chainId=<chainId>
export async function GET(
  request: NextRequest,
  { params }: { params: { address: `0x${string}` } },
) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const address = params.address.toLowerCase()
  const signature = await prisma.lenderServiceAgreementSignature.findFirst({
    where: {
      signer: address.toLowerCase(),
      chainId,
    },
  })

  return NextResponse.json({ isSigned: !!signature })
}

/// DELETE /api/sla/[address]?chainId=<chainId>
export async function DELETE(
  request: NextRequest,
  { params }: { params: { address: `0x${string}` } },
) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 })
  }
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const address = params.address.toLowerCase()
  await prisma.lenderServiceAgreementSignature.deleteMany({
    where: {
      signer: address.toLowerCase(),
      chainId,
    },
  })
  return NextResponse.json({ success: true })
}
