import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import {
  getCurrentServiceAgreement,
  isServiceAgreementTimeSignedInBounds,
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
  if (!isServiceAgreementTimeSignedInBounds(timeSigned)) {
    return NextResponse.json(
      { error: "timeSigned is outside the accepted signing window" },
      { status: 400 },
    )
  }
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
  await saveServiceAgreementSignature(verified)
  return NextResponse.json({ success: true })
}
