/// GET /api/mla/[market]/lenders

import { NextRequest, NextResponse } from "next/server"

import { verifyApiToken } from "@/app/api/auth/verify-header"
import { TargetChainId } from "@/config/network"
import { getSignedMasterLoanAgreement, prisma } from "@/lib/db"

/// Route to get the lenders who have signed the MLA for a given market.
export async function GET(
  request: NextRequest,
  { params }: { params: { market: string } },
) {
  const token = await verifyApiToken(request)
  if (!token) {
    return new NextResponse(null, { status: 401 })
  }
  const market = params.market.toLowerCase()
  const mla = await getSignedMasterLoanAgreement(market)
  if (!mla) {
    return new NextResponse(null, { status: 404 })
  }
  if (mla.borrower.toLowerCase() !== token.address.toLowerCase()) {
    return new NextResponse(null, { status: 403 })
  }
  const mlaSignatures = await prisma.mlaSignature.findMany({
    where: {
      chainId: TargetChainId,
      market,
    },
    select: {
      address: true,
    },
  })
  return NextResponse.json(mlaSignatures.map((m) => m.address))
}
