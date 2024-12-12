import { NextRequest, NextResponse } from "next/server"

import { getSignedMasterLoanAgreement } from "@/lib/db"
import { formatSignatureText } from "@/lib/signatures"
import { VerifiedSignature } from "@/lib/signatures/interface"

export async function GET(
  request: NextRequest,
  { params }: { params: { market: string } },
) {
  const market = params.market.toLowerCase()
  const mla = await getSignedMasterLoanAgreement(market)
  if (!mla) {
    return new NextResponse(null, { status: 404 })
  }
  if (!mla.borrowerSignature) {
    // This is a 500 error because the borrower signature should always be present.
    return new NextResponse(null, { status: 500 })
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
