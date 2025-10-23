import { NextRequest, NextResponse } from "next/server"

import { getSignedMasterLoanAgreement, prisma } from "@/lib/db"
import {
  fillInMlaForLender,
  MlaFieldValueKey,
  MlaTemplateField,
} from "@/lib/mla"
import { launchPuppeteer } from "@/lib/puppeteer"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

/// GET /api/mla/[market]/pdf?chainId=<chainId>
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
  const finalHtml = encodeURIComponent(html)
  const browser = await launchPuppeteer()
  const page = await browser.newPage()
  await page.goto(`data:text/html;charset=UTF-8,${finalHtml}`, {
    waitUntil: "networkidle0",
  })
  const pdfBuffer = await page.pdf({
    format: "A4",
    headerTemplate: "<p></p>",
    footerTemplate: "<p></p>",
    displayHeaderFooter: false,
    margin: {
      top: "40px",
      bottom: "40px",
    },
    printBackground: true,
  })
  const fileName = `${market} Master Loan Agreement.pdf`
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  })
}

export const dynamic = "force-dynamic"
