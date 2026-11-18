import { NextRequest, NextResponse } from "next/server"

import { getSignedMasterLoanAgreement } from "@/lib/db"
import { formatSignatureText } from "@/lib/signatures"
import { VerifiedSignature } from "@/lib/signatures/interface"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

/// GET /api/mla/[market]/signed?chainId=<chainId>
export async function GET(
  request: NextRequest,
  { params }: { params: { market: string } },
) {
  const market = params.market.toLowerCase()
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const mla = await getSignedMasterLoanAgreement(market, chainId)
  if (!mla) {
    return new NextResponse(null, { status: 404 })
  }
  const result = [
    mla.plaintext,
    `-----BEGIN BORROWER SIGNATURE-----`,
    formatSignatureText(mla.borrowerSignature as VerifiedSignature),
    `-----END BORROWER SIGNATURE-----`,
  ].join("\n")
  return new NextResponse(result, {
    headers: {
      "Content-Type": "text/plain",
    },
  })
}
