import { NextRequest, NextResponse } from "next/server"

import {
  ServiceAgreementPartyInput,
  ServiceAgreementReacceptanceResponse,
  ServiceAgreementStaleAccountInfo,
} from "@/app/api/service-agreement/interface"
import { prisma } from "@/lib/db"
import { getCurrentServiceAgreement } from "@/lib/serviceAgreement"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

import { isAdminForChain, verifyApiToken } from "../../auth/verify-header"

/// GET /api/service-agreement/reacceptance?chainId=<chainId>
/// Admin-only campaign overview: who declined the current version, and which
/// accounts hold only a stale acceptance ("remove them / ask why" work list).
/// Reads the new tables only - the backfill made them complete.
export async function GET(request: NextRequest) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!(await isAdminForChain(token, chainId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const current = await getCurrentServiceAgreement()
  const [refusals, signatures] = await Promise.all([
    prisma.serviceAgreementRefusal.findMany({
      where: { chainId, serviceAgreementId: current.id },
      select: {
        address: true,
        signer: true,
        party: true,
        reason: true,
        timeSigned: true,
      },
      orderBy: { timeSigned: "desc" },
    }),
    prisma.serviceAgreementSignature.findMany({
      where: { chainId },
      select: {
        address: true,
        party: true,
        serviceAgreementId: true,
        timeSigned: true,
        serviceAgreement: { select: { version: true } },
      },
    }),
  ])

  // Group acceptances by account; stale = accepted something, never the
  // current version.
  const byAddress = new Map<
    string,
    {
      parties: Set<ServiceAgreementPartyInput>
      hasCurrent: boolean
      latestVersion: string
      latestVersionId: number
      latestTimeSigned: Date
    }
  >()
  signatures.forEach((row) => {
    const entry = byAddress.get(row.address)
    if (!entry) {
      byAddress.set(row.address, {
        parties: new Set([row.party]),
        hasCurrent: row.serviceAgreementId === current.id,
        latestVersion: row.serviceAgreement.version,
        latestVersionId: row.serviceAgreementId,
        latestTimeSigned: row.timeSigned,
      })
    } else {
      entry.parties.add(row.party)
      entry.hasCurrent =
        entry.hasCurrent || row.serviceAgreementId === current.id
      if (row.serviceAgreementId > entry.latestVersionId) {
        entry.latestVersionId = row.serviceAgreementId
        entry.latestVersion = row.serviceAgreement.version
        entry.latestTimeSigned = row.timeSigned
      }
    }
  })
  const staleAccounts: ServiceAgreementStaleAccountInfo[] = Array.from(
    byAddress.entries(),
  )
    .filter(([, entry]) => !entry.hasCurrent)
    .map(([address, entry]) => ({
      address,
      parties: Array.from(entry.parties),
      latestAcceptedVersion: entry.latestVersion,
      latestTimeSigned: entry.latestTimeSigned.getTime(),
    }))

  const response: ServiceAgreementReacceptanceResponse = {
    currentVersion: {
      version: current.version,
      plaintextSha256: current.plaintextSha256,
      effectiveDate: current.effectiveDate.toISOString(),
      reacceptanceDeadline: current.reacceptanceDeadline?.toISOString() ?? null,
    },
    refusals: refusals.map((refusal) => ({
      address: refusal.address,
      signer: refusal.signer,
      party: refusal.party,
      reason: refusal.reason,
      timeSigned: refusal.timeSigned.getTime(),
    })),
    staleAccounts,
  }
  return NextResponse.json(response)
}

export const dynamic = "force-dynamic"
