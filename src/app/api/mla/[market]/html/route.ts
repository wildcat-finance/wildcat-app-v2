import { NextRequest, NextResponse } from "next/server"

import { getSignedMasterLoanAgreement, prisma } from "@/lib/db"
import {
  fillInMlaForLender,
  MlaFieldValueKey,
  MlaTemplateField,
} from "@/lib/mla"

/// GET /api/mla/[market]
/// Route to get the MLA for a given market.
export async function GET(
  request: NextRequest,
  { params }: { params: { market: string } },
) {
  const market = params.market.toLowerCase()
  const mla = await getSignedMasterLoanAgreement(market)
  const template = await prisma.mlaTemplate.findFirst({
    where: {
      id: mla?.templateId,
    },
  })
  if (!mla) {
    return new NextResponse(null, { status: 404 })
  }
  if (!mla.borrowerSignature) {
    // This is a 500 error because the borrower signature should always be present.
    return new NextResponse(null, { status: 500 })
  }
  // For the HTML version, we replace any unfilled fields with the placeholders.
  const values: Map<MlaFieldValueKey, string> = new Map(
    (template!.lenderFields as MlaTemplateField[]).map((field) => [
      field.source,
      `[${field.placeholder}]`,
    ]),
  )
  const { html } = fillInMlaForLender(mla, values, market)
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
    },
  })
}
