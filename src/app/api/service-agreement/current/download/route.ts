import { NextResponse } from "next/server"

import { getCurrentServiceAgreementContent } from "@/lib/serviceAgreement"

/// GET /api/service-agreement/current/download
/// Downloads the current canonical ToU plaintext stored in ServiceAgreement.
export async function GET() {
  const agreement = await getCurrentServiceAgreementContent()
  const version = agreement.version.replace(/[^a-zA-Z0-9._-]+/g, "-")
  return new NextResponse(agreement.plaintext, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="Wildcat Terms of Use - ${version}.txt"`,
    },
  })
}

export const dynamic = "force-dynamic"
