import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import {
  getCurrentServiceAgreement,
  isServiceAgreementTimeSignedInBounds,
  requireLegacyWrapperHash,
  saveServiceAgreementSignature,
  verifyServiceAgreementSignature,
} from "@/lib/serviceAgreement"
import { getZodParseError } from "@/lib/zod-error"

import { ServiceAgreementSignatureInputDTO } from "./dto"
import { ServiceAgreementSignatureInput } from "./interface"

export async function POST(request: NextRequest) {
  let body: ServiceAgreementSignatureInput
  try {
    const input = await request.json()
    body = ServiceAgreementSignatureInputDTO.parse(input)
    if (!isSupportedChainId(body.chainId)) {
      return NextResponse.json(
        { error: "Chain ID not supported" },
        { status: 400 },
      )
    }
  } catch (error) {
    return getZodParseError(error)
  }
  const { chainId, signature, timeSigned } = body
  const address = body.address.toLowerCase()
  const agreement = await getCurrentServiceAgreement()

  // A Safe action can be submitted after its original signing window once the
  // threshold signature is available. Match the generic acceptance route:
  // exact retries of an already-persisted action remain idempotent.
  const existing = await prisma.serviceAgreementSignature.findUnique({
    where: {
      chainId_address_party_serviceAgreementId: {
        chainId,
        address,
        party: "Lender",
        serviceAgreementId: agreement.id,
      },
    },
  })
  if (
    existing?.signature === signature &&
    existing.timeSigned.getTime() === timeSigned
  ) {
    return NextResponse.json({ success: true })
  }

  if (!isServiceAgreementTimeSignedInBounds(timeSigned)) {
    return NextResponse.json(
      { error: "timeSigned is outside the accepted signing window" },
      { status: 400 },
    )
  }
  const verified = await verifyServiceAgreementSignature({
    agreement,
    chainId,
    address,
    party: "Lender",
    signature,
    timeSigned,
  })
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }
  const serviceAgreementHash = requireLegacyWrapperHash(agreement)
  await prisma.$transaction(async (transaction) => {
    // New table first, old table second (compatibility dual-write, removed in
    // Release 2). Both writes commit or roll back together.
    await saveServiceAgreementSignature(verified, transaction)
    await transaction.lenderServiceAgreementSignature.upsert({
      where: {
        chainId_signer_serviceAgreementHash: {
          chainId,
          signer: address,
          serviceAgreementHash,
        },
      },
      update: {},
      create: {
        chainId,
        signer: address,
        signature,
        timeSigned: new Date(timeSigned),
        serviceAgreementHash,
      },
    })
  })
  return NextResponse.json({ success: true })
}
