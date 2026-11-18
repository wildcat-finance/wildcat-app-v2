import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { getSignedMasterLoanAgreement, prisma } from "@/lib/db"
import { fillInMlaForLender, getFieldValuesForLender } from "@/lib/mla"
import {
  isPrismaUniqueConstraintError,
  toStoredSignature,
} from "@/lib/mlaPersistence"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"
import { validateChainIdParam } from "@/lib/validateChainIdParam"
import { getZodParseError } from "@/lib/zod-error"
import { isServiceAgreementTimeSignedInBounds } from "@/utils/serviceAgreementMessage"

import { LenderMlaSignatureInputDTO } from "./dto"
import { LenderMlaSignatureInput } from "./interface"
import { toMlaSignatureResponse } from "../interface"

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
    await prisma.mlaLenderSignature.findMany({
      where: {
        chainId,
        address: lenderAddress,
      },
    })
  ).map(toMlaSignatureResponse)
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

  const lenderSignatureKey = {
    chainId_market_address: {
      chainId,
      market: marketAddress,
      address: lenderAddress,
    },
  }
  const signatureExists = await prisma.mlaLenderSignature.findUnique({
    where: lenderSignatureKey,
  })
  if (signatureExists) {
    if (
      signatureExists.signature === signature &&
      signatureExists.timeSigned.getTime() === timeSigned
    ) {
      return NextResponse.json({ success: true })
    }
    return NextResponse.json(
      { error: "Signature already exists" },
      { status: 409 },
    )
  }

  // MLA signing shares the ToU ceremony window: after the idempotent-replay
  // check so retries of an already-stored action still succeed; before
  // verification so a new record can only claim a signing time the server
  // clock roughly agrees with.
  if (!isServiceAgreementTimeSignedInBounds(timeSigned)) {
    return NextResponse.json(
      { error: "timeSigned is outside the accepted signing window" },
      { status: 400 },
    )
  }

  const mla = await getSignedMasterLoanAgreement(marketAddress, chainId)
  if (!mla) {
    return NextResponse.json({ error: "MLA not found" }, { status: 404 })
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
  try {
    await prisma.mlaLenderSignature.create({
      data: {
        chainId,
        address: lenderAddress,
        market: marketAddress,
        signature,
        ...toStoredSignature(verifiedSignature),
        timeSigned: new Date(timeSigned),
      },
    })
  } catch (error) {
    if (!isPrismaUniqueConstraintError(error)) throw error
    const concurrent = await prisma.mlaLenderSignature.findUnique({
      where: lenderSignatureKey,
    })
    if (
      concurrent?.signature !== signature ||
      concurrent.timeSigned.getTime() !== timeSigned
    ) {
      return NextResponse.json(
        { error: "Signature already exists" },
        { status: 409 },
      )
    }
  }
  return NextResponse.json({
    success: true,
  })
}

export const dynamic = "force-dynamic"
