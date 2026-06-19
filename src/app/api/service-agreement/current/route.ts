import { NextResponse } from "next/server"

import { CurrentServiceAgreementResponse } from "@/app/api/service-agreement/interface"
import { getCurrentServiceAgreementContent } from "@/lib/serviceAgreement"

/// GET /api/service-agreement/current
/// Canonical current Terms of Use content and signing acknowledgement.
export async function GET() {
  const agreement = await getCurrentServiceAgreementContent()
  const response: CurrentServiceAgreementResponse = {
    version: agreement.version,
    plaintext: agreement.plaintext,
    html: agreement.html,
    plaintextSha256: agreement.plaintextSha256,
    legacyWrapperHash: agreement.legacyWrapperHash,
    acknowledgementText: agreement.acknowledgementText,
    effectiveDate: agreement.effectiveDate.toISOString(),
  }
  return NextResponse.json(response)
}

export const dynamic = "force-dynamic"
