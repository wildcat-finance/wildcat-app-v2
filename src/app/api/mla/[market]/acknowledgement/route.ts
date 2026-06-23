import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { NON_MLA_ACKNOWLEDGEMENT_TEXT_VERSION } from "@/config/non-mla-acknowledgement"
import { getSignedMasterLoanAgreement, prisma } from "@/lib/db"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"
import { validateChainIdParam } from "@/lib/validateChainIdParam"
import { getZodParseError } from "@/lib/zod-error"
import { buildNonMlaAcknowledgementText } from "@/utils/nonMlaAcknowledgementMessage"

import { NonMlaAcknowledgementInputDTO } from "./dto"
import {
  NonMlaAcknowledgementInput,
  NonMlaAcknowledgementResponse,
} from "./interface"

/// GET /api/mla/[market]/acknowledgement?chainId=<chainId>&lenderAddress=<address>
export async function GET(
  request: NextRequest,
  { params }: { params: { market: string } },
) {
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

  const acknowledgement = await prisma.nonMlaAcknowledgement.findFirst({
    where: {
      chainId,
      market: params.market.toLowerCase(),
      address: lenderAddress,
      acknowledgementTextVersion: NON_MLA_ACKNOWLEDGEMENT_TEXT_VERSION,
    },
  })

  if (!acknowledgement) {
    return NextResponse.json(
      { error: "Acknowledgement not found" },
      { status: 404 },
    )
  }

  const { blockNumber, ...rest } = acknowledgement
  return NextResponse.json({
    ...rest,
    blockNumber: blockNumber || undefined,
  } as NonMlaAcknowledgementResponse)
}

/// POST /api/mla/[market]/acknowledgement
export async function POST(
  request: NextRequest,
  { params }: { params: { market: string } },
) {
  let body: NonMlaAcknowledgementInput

  try {
    const input = await request.json()
    body = NonMlaAcknowledgementInputDTO.parse(input)
    if (!isSupportedChainId(body.chainId)) {
      return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
    }
  } catch (error) {
    return getZodParseError(error)
  }

  const marketAddress = params.market.toLowerCase()
  const lenderAddress = body.address.toLowerCase()
  const { chainId, signature, timeSigned } = body

  const mla = await getSignedMasterLoanAgreement(marketAddress, chainId)
  if (mla) {
    return NextResponse.json({ error: "MLA already exists" }, { status: 400 })
  }

  const refusal = await prisma.refusalToAssignMla.findFirst({
    where: {
      chainId,
      market: marketAddress,
    },
  })
  if (!refusal) {
    return NextResponse.json(
      { error: "MLA assignment refusal not found" },
      { status: 400 },
    )
  }

  const acknowledgementText = buildNonMlaAcknowledgementText({
    market: marketAddress,
    chainId,
  })
  const verifiedSignature = await verifyAndDescribeSignature({
    provider: getProviderForServer(chainId),
    address: lenderAddress,
    message: acknowledgementText,
    signature,
  })
  if (!verifiedSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  await prisma.nonMlaAcknowledgement.upsert({
    where: {
      chainId_market_address_acknowledgementTextVersion: {
        chainId,
        market: marketAddress,
        address: lenderAddress,
        acknowledgementTextVersion: NON_MLA_ACKNOWLEDGEMENT_TEXT_VERSION,
      },
    },
    update: {},
    create: {
      chainId,
      market: marketAddress,
      address: lenderAddress,
      signer:
        "owner" in verifiedSignature
          ? verifiedSignature.owner.toLowerCase()
          : verifiedSignature.address.toLowerCase(),
      signature,
      blockNumber:
        "blockNumber" in verifiedSignature
          ? verifiedSignature.blockNumber
          : undefined,
      kind: verifiedSignature.kind,
      acknowledgementTextVersion: NON_MLA_ACKNOWLEDGEMENT_TEXT_VERSION,
      acknowledgementText,
      timeSigned: new Date(timeSigned).toISOString(),
    },
  })

  return NextResponse.json({ success: true })
}

export const dynamic = "force-dynamic"
