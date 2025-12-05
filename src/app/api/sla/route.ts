import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { keccak256, toUtf8Bytes } from "ethers/lib/utils"
import { NextRequest, NextResponse } from "next/server"

import AgreementText from "@/config/wildcat-service-agreement-acknowledgement.json"
import { prisma } from "@/lib/db"
import { getProviderForServer } from "@/lib/provider"
import { verifySignature } from "@/lib/signatures"
import { getZodParseError } from "@/lib/zod-error"
import { formatUnixMsAsDate } from "@/utils/formatters"

import { ServiceAgreementSignatureInputDTO } from "./dto"
import { ServiceAgreementSignatureInput } from "./interface"

const ServiceAgreementVersion = keccak256(toUtf8Bytes(AgreementText))

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
  const { signature, timeSigned } = body
  const address = body.address.toLowerCase()
  const existingSignature =
    await prisma.lenderServiceAgreementSignature.findFirst({
      where: {
        chainId: body.chainId,
        signer: address,
        serviceAgreementHash: ServiceAgreementVersion,
      },
    })
  if (existingSignature) {
    return NextResponse.json({ success: true })
  }
  const dateSigned = formatUnixMsAsDate(timeSigned)
  const agreementText = `${AgreementText}\n\nDate: ${dateSigned}`
  const provider = getProviderForServer(body.chainId)
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
      chainId: body.chainId,
      signer: address,
      signature,
      timeSigned: new Date(timeSigned).toISOString(),
      serviceAgreementHash: ServiceAgreementVersion,
    },
  })
  return NextResponse.json({ success: true })
}
