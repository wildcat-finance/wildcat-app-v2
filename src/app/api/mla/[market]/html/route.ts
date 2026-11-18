import { NextRequest, NextResponse } from "next/server"

import { getSignedMasterLoanAgreement } from "@/lib/db"
import { fillInMlaForLender, MlaFieldValueKey } from "@/lib/mla"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

/// GET /api/mla/[market]?chainId=<chainId>
/// Route to get the MLA for a given market.
export async function GET(
  request: NextRequest,
  { params }: { params: { market: string } },
) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const market = params.market.toLowerCase()
  const mla = await getSignedMasterLoanAgreement(market, chainId)
  if (!mla) {
    return new NextResponse(null, { status: 404 })
  }
  // For the HTML version, we replace any unfilled fields with the placeholders.
  const values: Map<MlaFieldValueKey, string> = new Map(
    mla.lenderFields.map((field) => [field.source, `[${field.placeholder}]`]),
  )
  const { html } = fillInMlaForLender(mla, values, market)
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
    },
  })
}
