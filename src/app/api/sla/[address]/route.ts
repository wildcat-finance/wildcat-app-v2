import { NextRequest, NextResponse } from "next/server"

import { ServiceAgreementGateResponse } from "@/app/api/service-agreement/interface"
import { hasSignedServiceAgreement, prisma } from "@/lib/db"
import { getServiceAgreementGateStatus } from "@/lib/serviceAgreement"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

/// GET /api/sla/[address]?chainId=<chainId>
/// `isSigned` keeps its historical lender-scoped meaning (drives the hard
/// /agreement gate); `state`/`currentVersion` drive the re-acceptance flow.
export async function GET(
  request: NextRequest,
  { params }: { params: { address: `0x${string}` } },
) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const address = params.address.toLowerCase()
  const [isSigned, gate] = await Promise.all([
    hasSignedServiceAgreement(chainId, address),
    getServiceAgreementGateStatus(chainId, address),
  ])
  const response: ServiceAgreementGateResponse = {
    isSigned,
    state: gate.state,
    currentVersion: {
      version: gate.currentVersion.version,
      plaintextSha256: gate.currentVersion.plaintextSha256,
      effectiveDate: gate.currentVersion.effectiveDate.toISOString(),
      reacceptanceDeadline:
        gate.currentVersion.reacceptanceDeadline?.toISOString() ?? null,
    },
    acceptedVersion: gate.acceptedVersion
      ? {
          version: gate.acceptedVersion.version,
          plaintextSha256: gate.acceptedVersion.plaintextSha256,
          effectiveDate: gate.acceptedVersion.effectiveDate.toISOString(),
        }
      : null,
  }
  return NextResponse.json(response)
}

/// DELETE /api/sla/[address]?chainId=<chainId>
export async function DELETE(
  request: NextRequest,
  { params }: { params: { address: `0x${string}` } },
) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 })
  }
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const address = params.address.toLowerCase()
  // Clear the lender's signed status from both tables during the compatibility
  // window; the old-table delete is removed in Release 2.
  await prisma.serviceAgreementSignature.deleteMany({
    where: {
      chainId,
      address,
      party: "Lender",
    },
  })
  await prisma.lenderServiceAgreementSignature.deleteMany({
    where: {
      signer: address,
      chainId,
    },
  })
  return NextResponse.json({ success: true })
}
