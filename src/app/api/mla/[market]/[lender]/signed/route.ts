import { NextRequest, NextResponse } from "next/server"
import puppeteer from "puppeteer"

import { TargetChainId } from "@/config/network"
import { getSignedMasterLoanAgreement, prisma } from "@/lib/db"
import { fillInMlaForLender, getFieldValuesForLender } from "@/lib/mla"
import { formatSignatureText } from "@/lib/signatures"
import { VerifiedSignature } from "@/lib/signatures/interface"

/// GET /api/mla/[market]
/// Route to get the MLA for a given market.
export async function GET(
  request: NextRequest,
  { params }: { params: { market: string; lender: string } },
) {
  const market = params.market.toLowerCase()
  const lenderAddress = params.lender.toLowerCase()
  const mla = await getSignedMasterLoanAgreement(market)

  if (!mla) {
    return new NextResponse(null, { status: 404 })
  }
  if (!mla.borrowerSignature) {
    // This is a 500 error because the borrower signature should always be present.
    return new NextResponse(null, { status: 500 })
  }

  const mlaSignature = await prisma.mlaSignature.findFirst({
    where: {
      chainId: TargetChainId,
      address: lenderAddress,
      market,
    },
  })
  if (!mlaSignature) {
    return NextResponse.json(
      { error: "MLA signature not found" },
      { status: 404 },
    )
  }

  const timeSigned = +mlaSignature.timeSigned
  const values = getFieldValuesForLender(lenderAddress, timeSigned)
  const { plaintext } = fillInMlaForLender(mla, values)
  const borrowerSignature = mla.borrowerSignature!

  const result = [
    plaintext,
    `-----BEGIN BORROWER SIGNATURE-----`,
    formatSignatureText(borrowerSignature as VerifiedSignature),
    `-----END BORROWER SIGNATURE-----`,
    ``,
    `-----BEGIN LENDER SIGNATURE-----`,
    formatSignatureText(mlaSignature as VerifiedSignature),
    `-----END LENDER SIGNATURE-----`,
  ].join("\n")
  return new NextResponse(result, {
    headers: {
      "Content-Type": "text/plain",
    },
  })
}

export const dynamic = "force-dynamic"
