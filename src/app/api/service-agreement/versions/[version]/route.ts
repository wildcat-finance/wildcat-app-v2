import { NextRequest, NextResponse } from "next/server"

import type { CurrentServiceAgreementResponse } from "@/app/api/service-agreement/interface"
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
  const response: CurrentServiceAgreementResponse = {
    version: agreement.version,
    plaintext: agreement.plaintext,
    html: agreement.html,
    plaintextSha256: agreement.plaintextSha256,
    legacyWrapperHash: agreement.legacyWrapperHash,
    acknowledgementText: agreement.acknowledgementText,
    effectiveDate: agreement.effectiveDate.toISOString(),
    reacceptanceDeadline: agreement.reacceptanceDeadline?.toISOString() ?? null,
  }
  return NextResponse.json(response)
}

export const dynamic = "force-dynamic"
