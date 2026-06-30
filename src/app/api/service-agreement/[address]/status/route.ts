import { NextRequest, NextResponse } from "next/server"

import {
  getCurrentServiceAgreement,
  getLatestBorrowerAcceptanceStatus,
} from "@/lib/serviceAgreement"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

import { ServiceAgreementStatusResponse } from "../../interface"

/// GET /api/service-agreement/[address]/status?chainId=<chainId>
/// Borrower's accepted ToU version + acceptance time, plus the current live
/// version. Returns accepted: null (not 404) when the borrower has no acceptance.
export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } },
) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const address = params.address.toLowerCase()
  const [current, acceptance] = await Promise.all([
    getCurrentServiceAgreement(),
    getLatestBorrowerAcceptanceStatus(chainId, address),
  ])
  const response: ServiceAgreementStatusResponse = {
    current: {
      version: current.version,
      plaintextSha256: current.plaintextSha256,
      effectiveDate: current.effectiveDate.toISOString(),
    },
    accepted: acceptance
      ? {
          version: acceptance.serviceAgreement.version,
          plaintextSha256: acceptance.serviceAgreement.plaintextSha256,
          legacyWrapperHash: acceptance.serviceAgreement.legacyWrapperHash,
          organizationName: acceptance.organizationName,
          acceptedAt: acceptance.timeSigned.getTime(),
        }
      : null,
  }
  return NextResponse.json(response)
}

export const dynamic = "force-dynamic"
