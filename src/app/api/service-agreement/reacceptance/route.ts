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
/// Reads the versioned acceptance and refusal snapshots.
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

  // Group acceptances by capacity; a current Borrower acceptance must not hide
  // a stale Lender acceptance for the same dual-role account (or vice versa).
  const byCapacity = new Map<
    string,
    {
      address: string
      party: ServiceAgreementPartyInput
      hasCurrent: boolean
      latestVersion: string
      latestVersionId: number
      latestTimeSigned: Date
    }
  >()
  signatures.forEach((row) => {
    const key = `${row.address}:${row.party}`
    const entry = byCapacity.get(key)
    if (!entry) {
      byCapacity.set(key, {
        address: row.address,
        party: row.party,
        hasCurrent: row.serviceAgreementId === current.id,
        latestVersion: row.serviceAgreement.version,
        latestVersionId: row.serviceAgreementId,
        latestTimeSigned: row.timeSigned,
      })
    } else {
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
    byCapacity.values(),
  )
    .filter((entry) => !entry.hasCurrent)
    .map((entry) => ({
      address: entry.address,
      party: entry.party,
      latestAcceptedVersion: entry.latestVersion,
      latestTimeSigned: entry.latestTimeSigned.getTime(),
    }))

  const currentAcceptanceCapacities = new Set<string>()
  signatures
    .filter(({ serviceAgreementId }) => serviceAgreementId === current.id)
    .forEach(({ address, party }) => {
      currentAcceptanceCapacities.add(`${address}:${party}`)
    })
  const activeRefusals = refusals.filter(
    (refusal) =>
      !currentAcceptanceCapacities.has(`${refusal.address}:${refusal.party}`),
  )

  const response: ServiceAgreementReacceptanceResponse = {
    currentVersion: {
      version: current.version,
      plaintextSha256: current.plaintextSha256,
      effectiveDate: current.effectiveDate.toISOString(),
      reacceptanceDeadline: current.reacceptanceDeadline?.toISOString() ?? null,
    },
    refusals: activeRefusals.map((refusal) => ({
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
