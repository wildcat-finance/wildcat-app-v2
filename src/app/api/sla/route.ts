import { keccak256 } from "ethers/lib/utils"
import { NextRequest, NextResponse } from "next/server"

import { TargetChainId } from "@/config/network"
import AgreementText from "@/config/wildcat-service-agreement-acknowledgement.json"
import { prisma } from "@/lib/db"
import { getProviderForServer } from "@/lib/provider"
import { verifySignature } from "@/lib/signatures"
import { getZodParseError } from "@/lib/zod-error"

import { ServiceAgreementSignatureInputDTO } from "./dto"
import { ServiceAgreementSignatureInput } from "./interface"

const ServiceAgreementVersion = keccak256(AgreementText)

export async function POST(request: NextRequest) {
  let body: ServiceAgreementSignatureInput
  try {
    const input = await request.json()
    body = ServiceAgreementSignatureInputDTO.parse(input)
  } catch (error) {
    return getZodParseError(error)
  }
  const { signature, dateSigned, address } = body
  const agreementText = `${AgreementText}\n\nDate: ${dateSigned}`
  const provider = getProviderForServer()
  const result = await verifySignature({
    provider,
    signature,
    message: agreementText,
    address,
    allowSingleSafeOwner: false,
  })
  if (!result) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }
  await prisma.lenderServiceAgreementSignature.create({
    data: {
      chainId: TargetChainId,
      signer: address.toLowerCase(),
      signature,
      timeSigned: dateSigned,
      serviceAgreementHash: ServiceAgreementVersion,
    },
  })
  return NextResponse.json({ success: true })
}
