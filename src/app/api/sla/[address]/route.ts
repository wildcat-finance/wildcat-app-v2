import { NextRequest, NextResponse } from "next/server"

import {
  ServiceAgreementGateResponse,
  ServiceAgreementPartyInput,
} from "@/app/api/service-agreement/interface"
import { prisma } from "@/lib/db"
import { getServiceAgreementGateStatus } from "@/lib/serviceAgreement"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

const getPartyParam = (
  request: NextRequest,
): ServiceAgreementPartyInput | undefined => {
  const party = request.nextUrl.searchParams.get("party")
  return party === "Borrower" || party === "Lender" ? party : undefined
}

/// GET /api/sla/[address]?chainId=<chainId>&party=<Borrower|Lender>
/// Every status field is scoped to the requested account capacity.
export async function GET(
  request: NextRequest,
  { params }: { params: { address: `0x${string}` } },
) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const party = getPartyParam(request)
  if (!party) {
    return NextResponse.json({ error: "Invalid party" }, { status: 400 })
  }
  const address = params.address.toLowerCase()
  const gate = await getServiceAgreementGateStatus(chainId, address, party)
  const response: ServiceAgreementGateResponse = {
    party,
    isSigned: gate.hasAnyAcceptance,
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
  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  })
}

export const dynamic = "force-dynamic"

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
  // Clear both versioned snapshots and the legacy compatibility row.
  await prisma.$transaction([
    prisma.serviceAgreementSignature.deleteMany({
      where: {
        chainId,
        address,
        party: "Lender",
      },
    }),
    prisma.serviceAgreementRefusal.deleteMany({
      where: {
        chainId,
        address,
        party: "Lender",
      },
    }),
    prisma.lenderServiceAgreementSignature.deleteMany({
      where: {
        signer: address,
        chainId,
      },
    }),
  ])
  return NextResponse.json({ success: true })
}
