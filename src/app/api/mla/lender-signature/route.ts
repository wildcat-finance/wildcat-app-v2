import { NextRequest, NextResponse } from "next/server"

import { TargetChainId } from "@/config/network"
import { getSignedMasterLoanAgreement, prisma } from "@/lib/db"
import {
  fillInMlaForLender,
  fillInMlaTemplate,
  getFieldValuesForLender,
  MlaTemplateField,
} from "@/lib/mla"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"
import { getZodParseError } from "@/lib/zod-error"

import { LenderMlaSignatureInputDTO } from "./dto"
import { LenderMlaSignatureInput } from "./interface"
import { MasterLoanAgreementResponse, MlaSignatureResponse } from "../interface"

export async function GET(request: NextRequest) {
  const lenderAddress = request.nextUrl.searchParams
    .get("lenderAddress")
    ?.toLowerCase()
  if (!lenderAddress) {
    return NextResponse.json(
      { error: "Lender address is required" },
      { status: 400 },
    )
  }
  const mlaSignatures = (
    await prisma.mlaSignature.findMany({
      where: {
        chainId: TargetChainId,
        address: lenderAddress,
      },
    })
  ).map(
    ({ blockNumber, ...rest }) =>
      ({
        ...rest,
        blockNumber: blockNumber || undefined,
      }) as MlaSignatureResponse,
  )
  return NextResponse.json(mlaSignatures)
}

/// POST /api/mla/lender-signature
export async function POST(request: NextRequest) {
  let body: LenderMlaSignatureInput

  try {
    const input = await request.json()
    body = LenderMlaSignatureInputDTO.parse(input)
  } catch (error) {
    return getZodParseError(error)
  }
  const marketAddress = body.market.toLowerCase()
  const lenderAddress = body.address.toLowerCase()
  const { timeSigned, signature } = body

  const signatureExists = await prisma.mlaSignature.findFirst({
    where: {
      chainId: TargetChainId,
      address: lenderAddress,
      market: marketAddress,
    },
  })
  if (signatureExists) {
    return NextResponse.json(
      { error: "Signature already exists" },
      { status: 400 },
    )
  }

  const mla = await getSignedMasterLoanAgreement(marketAddress)
  if (!mla) {
    return NextResponse.json({ error: "MLA not found" }, { status: 404 })
  }
  if (!mla.borrowerSignature) {
    // This is a 500 error because the borrower signature should always be present.
    return NextResponse.json(
      { error: "Borrower signature not found" },
      { status: 500 },
    )
  }
  const values = getFieldValuesForLender(lenderAddress, timeSigned)
  const { plaintext } = fillInMlaForLender(mla, values)
  const provider = getProviderForServer()
  const verifiedSignature = await verifyAndDescribeSignature({
    provider,
    address: lenderAddress,
    message: plaintext,
    signature,
  })
  if (!verifiedSignature) {
    return NextResponse.json(
      { error: "Signature verification failed" },
      { status: 400 },
    )
  }
  await prisma.mlaSignature.create({
    data: {
      chainId: TargetChainId,
      address: lenderAddress,
      market: marketAddress,
      signature,
      blockNumber:
        "blockNumber" in verifiedSignature
          ? verifiedSignature.blockNumber
          : undefined,
      kind: verifiedSignature.kind,
      signer:
        "owner" in verifiedSignature
          ? verifiedSignature.owner.toLowerCase()
          : lenderAddress,
      timeSigned: new Date(timeSigned).toISOString(),
    },
  })
  return NextResponse.json({
    success: true,
  })
}

export const dynamic = "force-dynamic"
