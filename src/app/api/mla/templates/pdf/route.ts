import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { renderAgreementPdf } from "@/lib/puppeteer"
import { getZodParseError } from "@/lib/zod-error"

import { isAdminForChain, verifyApiToken } from "../../../auth/verify-header"

const MlaPdfInputDTO = z.object({
  chainId: z.number(),
  // The Wildcat MLA's HTML is about 125 KB; this leaves ample room.
  html: z.string().trim().min(1).max(5_000_000),
})

/// POST /api/mla/templates/pdf
/// An MLA template's HTML as the A4 PDF borrowers and lenders download, for
/// an admin to check a template, or a custom MLA before registering it. The
/// caller sends the HTML it shows, placeholders already in brackets.
/// Admin-only endpoint.
export async function POST(request: NextRequest) {
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  let body: z.infer<typeof MlaPdfInputDTO>
  try {
    body = MlaPdfInputDTO.parse(await request.json())
  } catch (error) {
    return getZodParseError(error)
  }
  if (
    !isSupportedChainId(body.chainId) ||
    !(await isAdminForChain(token, body.chainId))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const pdf = await renderAgreementPdf(body.html)
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store",
    },
  })
}

export const dynamic = "force-dynamic"
