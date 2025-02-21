import { NextRequest, NextResponse } from "next/server"
import puppeteer from "puppeteer"

import { TargetChainId } from "@/config/network"
import { getSignedMasterLoanAgreement, prisma } from "@/lib/db"
import { fillInMlaForLender, getFieldValuesForLender } from "@/lib/mla"

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
  const { html } = fillInMlaForLender(mla, values, market)
  const finalHtml = encodeURIComponent(html)
  const browser = await puppeteer.launch({
    args: ["--no-sandbox"],
    headless: true,
  })
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
