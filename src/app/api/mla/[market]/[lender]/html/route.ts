import { NextRequest, NextResponse } from "next/server"

import { getSignedMasterLoanAgreement, prisma } from "@/lib/db"
import {
  AGREEMENT_HTML_CSP,
  fillInMlaForLender,
  getFieldValuesForLender,
} from "@/lib/mla"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

/// GET /api/mla/[market]?chainId=<chainId>
/// Route to get the MLA for a given market.
export async function GET(
  request: NextRequest,
  { params }: { params: { market: string; lender: string } },
) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const market = params.market.toLowerCase()
  const lenderAddress = params.lender.toLowerCase()
  const mla = await getSignedMasterLoanAgreement(market, chainId)

  if (!mla) {
    return new NextResponse(null, { status: 404 })
  }
  const mlaSignature = await prisma.mlaLenderSignature.findUnique({
    where: {
      chainId_market_address: { chainId, market, address: lenderAddress },
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
  const { html } = fillInMlaForLender(mla, values, market)
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
      "Content-Security-Policy": AGREEMENT_HTML_CSP,
    },
  })
}

export const dynamic = "force-dynamic"
