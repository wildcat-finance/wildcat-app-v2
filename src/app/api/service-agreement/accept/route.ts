import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { AcceptServiceAgreementInput } from "@/app/api/service-agreement/interface"
import { prisma } from "@/lib/db"
import {
  getCurrentServiceAgreement,
  saveServiceAgreementSignature,
  verifyServiceAgreementSignature,
} from "@/lib/serviceAgreement"
import { getZodParseError } from "@/lib/zod-error"

import { AcceptServiceAgreementInputDTO } from "./dto"

/// POST /api/service-agreement/accept
/// Party-generic acceptance of the CURRENT ToU version - the re-acceptance
/// path for accounts whose acceptance is stale (or who declined and changed
/// their mind; an acceptance supersedes a recorded refusal).
///
/// Writes the new table only. No old-table dual-write: a repeat acceptance is
/// unrepresentable in the legacy tables (the old borrower table's PK is one
/// row per account) and rolled-back app code has no re-acceptance feature to
/// stay compatible with.
///
/// The wallet signature is the authentication, as with POST /api/sla.
export async function POST(request: NextRequest) {
  let body: AcceptServiceAgreementInput
  try {
    const input = await request.json()
    body = AcceptServiceAgreementInputDTO.parse(input)
    if (!isSupportedChainId(body.chainId)) {
      return NextResponse.json(
        { error: "Chain ID not supported" },
        { status: 400 },
      )
    }
  } catch (error) {
    return getZodParseError(error)
  }
  const { chainId, signature, timeSigned, party } = body
  const address = body.address.toLowerCase()

  // The borrower message embeds the organization name; derive it from the
  // stored profile rather than trusting request input for a legal record.
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

  const agreement = await getCurrentServiceAgreement()
  const verified = await verifyServiceAgreementSignature({
    agreement,
    chainId,
    address,
    party,
    signature,
    timeSigned,
    organizationName,
  })
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }
  await saveServiceAgreementSignature(verified)
  return NextResponse.json({ success: true })
}

export const dynamic = "force-dynamic"
