import { NextRequest, NextResponse } from "next/server"

import { hasSignedServiceAgreement, prisma } from "@/lib/db"
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
  const isSigned = await hasSignedServiceAgreement(chainId, address)
  return NextResponse.json({ isSigned })
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
  // Clear the lender's signed status from both tables during the compatibility
  // window; the old-table delete is removed in Release 2.
  await prisma.serviceAgreementSignature.deleteMany({
    where: {
      chainId,
      address,
      party: "Lender",
    },
  })
  await prisma.lenderServiceAgreementSignature.deleteMany({
    where: {
      signer: address,
      chainId,
    },
  })
  return NextResponse.json({ success: true })
}
