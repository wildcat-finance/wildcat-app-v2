import { NextRequest, NextResponse } from "next/server"

import { getServiceAgreementContentByVersion } from "@/lib/serviceAgreement"

export async function GET(
  _request: NextRequest,
  { params }: { params: { version: string } },
) {
  const agreement = await getServiceAgreementContentByVersion(params.version)
  if (!agreement) {
    return NextResponse.json(
      { error: "Terms of Use unavailable" },
      { status: 404 },
    )
  }
  const version = agreement.version.replace(/[^a-zA-Z0-9._-]+/g, "-")
  return new NextResponse(agreement.plaintext, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="Wildcat Terms of Use - ${version}.txt"`,
    },
  })
}

export const dynamic = "force-dynamic"
