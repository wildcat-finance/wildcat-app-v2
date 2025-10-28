import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { getSignedMasterLoanAgreement, prisma } from "@/lib/db"
import { fillInMlaForLender, getFieldValuesForLender } from "@/lib/mla"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"
import { validateChainIdParam } from "@/lib/validateChainIdParam"
import { getZodParseError } from "@/lib/zod-error"

import { LenderMlaSignatureInputDTO } from "./dto"
import { LenderMlaSignatureInput } from "./interface"
import { MlaSignatureResponse } from "../interface"

/// GET /api/mla/lender-signature?chainId=<chainId>
export async function GET(request: NextRequest) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
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
        chainId,
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
    if (!isSupportedChainId(body.chainId)) {
      return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
    }
  } catch (error) {
    return getZodParseError(error)
  }
  const marketAddress = body.market.toLowerCase()
  const lenderAddress = body.address.toLowerCase()
  const { timeSigned, signature, chainId } = body

  const signatureExists = await prisma.mlaSignature.findFirst({
    where: {
      chainId,
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

  const mla = await getSignedMasterLoanAgreement(marketAddress, chainId)
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
  const { plaintext, message } = fillInMlaForLender(mla, values, marketAddress)
  const provider = getProviderForServer(chainId)
  const verifiedSignature = await verifyAndDescribeSignature({
    provider,
    address: lenderAddress,
    message,
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
      chainId,
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
