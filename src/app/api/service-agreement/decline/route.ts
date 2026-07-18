import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { DeclineServiceAgreementInput } from "@/app/api/service-agreement/interface"
import { prisma } from "@/lib/db"
import {
  getCurrentServiceAgreement,
  saveServiceAgreementRefusal,
  verifyServiceAgreementRefusal,
} from "@/lib/serviceAgreement"
import { getZodParseError } from "@/lib/zod-error"
import { normalizeServiceAgreementDeclineReason } from "@/utils/serviceAgreementMessage"

import { DeclineServiceAgreementInputDTO } from "./dto"

/// POST /api/service-agreement/decline
/// Records a signed refusal of the CURRENT ToU version. The signed message is
/// distinct from the acceptance message so the two can never be confused
/// (mirrors the MLA decline flow). The latest acceptance/refusal timestamp
/// controls the gate; both snapshots are kept.
export async function POST(request: NextRequest) {
  let body: DeclineServiceAgreementInput
  try {
    const input = await request.json()
    body = DeclineServiceAgreementInputDTO.parse(input)
    if (!isSupportedChainId(body.chainId)) {
      return NextResponse.json(
        { error: "Chain ID not supported" },
        { status: 400 },
      )
    }
  } catch (error) {
    return getZodParseError(error)
  }
  const { chainId, signature, timeSigned, party, reason } = body
  const address = body.address.toLowerCase()
  const agreement = await getCurrentServiceAgreement()

  const existing = await prisma.serviceAgreementRefusal.findUnique({
    where: {
      chainId_address_party_serviceAgreementId: {
        chainId,
        address,
        party,
        serviceAgreementId: agreement.id,
      },
    },
  })
  if (
    existing?.signature === signature &&
    existing.timeSigned.getTime() === timeSigned &&
    existing.reason === (normalizeServiceAgreementDeclineReason(reason) ?? null)
  ) {
    return NextResponse.json({ success: true })
  }

  let organizationName: string | undefined
  if (party === "Borrower") {
    const borrower = await prisma.borrower.findFirst({
      where: { chainId, address },
      select: { name: true },
    })
    if (!borrower?.name) {
      return NextResponse.json(
        { error: `No borrower profile with a name for ${address}` },
        { status: 400 },
      )
    }
    organizationName = borrower.name
  }

  const verified = await verifyServiceAgreementRefusal({
    agreement,
    chainId,
    address,
    party,
    signature,
    timeSigned,
    reason,
    organizationName,
  })
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }
  await saveServiceAgreementRefusal(verified)
  return NextResponse.json({ success: true })
}

export const dynamic = "force-dynamic"
