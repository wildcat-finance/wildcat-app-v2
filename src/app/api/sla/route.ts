import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import {
  getCurrentServiceAgreement,
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
  // New table first, old table second (compatibility dual-write, removed in
  // Release 2). Both writes are idempotent.
  await saveServiceAgreementSignature(verified)
  await prisma.lenderServiceAgreementSignature.upsert({
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
  return NextResponse.json({ success: true })
}
