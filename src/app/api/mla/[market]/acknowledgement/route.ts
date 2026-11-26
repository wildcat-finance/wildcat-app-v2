import { NonMlaAcknowledgement } from "@prisma/client"
import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { WildcatMarket__factory as WildcatMarketFactory } from "@wildcatfi/wildcat-sdk/dist/typechain"
import { NextRequest, NextResponse } from "next/server"

import { NETWORKS_BY_ID } from "@/config/network"
import { NON_MLA_ACKNOWLEDGEMENT_TEXT_VERSION } from "@/config/non-mla-acknowledgement"
import { findBorrowerRegistration, prisma } from "@/lib/db"
import { toStoredSignature } from "@/lib/mlaPersistence"
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

// The acknowledgement has one server time; the response keeps its old name.
const toResponse = ({
  blockNumber,
  createdAt,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  outcome,
  ...rest
}: NonMlaAcknowledgement): NonMlaAcknowledgementResponse => ({
  ...rest,
  blockNumber: blockNumber || undefined,
  timeSigned: createdAt,
})

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

  return NextResponse.json(toResponse(acknowledgement))
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
  const { chainId, signature } = body

  const existingAcknowledgement = await prisma.nonMlaAcknowledgement.findUnique(
    {
      where: {
        chainId_market_address_acknowledgementTextVersion: {
          chainId,
          market: marketAddress,
          address: lenderAddress,
          acknowledgementTextVersion: NON_MLA_ACKNOWLEDGEMENT_TEXT_VERSION,
        },
      },
    },
  )
  if (existingAcknowledgement) {
    if (existingAcknowledgement.signature !== signature) {
      return NextResponse.json(
        { error: "Acknowledgement already exists" },
        { status: 409 },
      )
    }
    return NextResponse.json(toResponse(existingAcknowledgement))
  }

  const decision = await prisma.marketMlaDecision.findUnique({
    where: { chainId_market: { chainId, market: marketAddress } },
    select: {
      outcome: true,
      borrowerAddress: true,
      borrower: { select: { name: true, alias: true } },
    },
  })
  if (decision?.outcome === "Assigned") {
    return NextResponse.json({ error: "MLA already exists" }, { status: 400 })
  }
  if (!decision) {
    return NextResponse.json(
      { error: "MLA assignment refusal not found" },
      { status: 400 },
    )
  }

  // A refusal from an account with no borrower record at the time may have
  // gained one since.
  const borrowerProfile =
    decision.borrower ??
    (await findBorrowerRegistration(chainId, decision.borrowerAddress))
      ?.borrower
  if (!borrowerProfile?.name) {
    return NextResponse.json(
      { error: "Borrower profile not found" },
      { status: 400 },
    )
  }

  const networkName = NETWORKS_BY_ID[chainId]?.name
  if (!networkName) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }

  const provider = getProviderForServer(chainId)
  let marketName: string
  try {
    marketName = await WildcatMarketFactory.connect(
      marketAddress,
      provider,
    ).name()
  } catch {
    return NextResponse.json({ error: "Invalid market" }, { status: 400 })
  }

  const acknowledgementText = buildNonMlaAcknowledgementText({
    marketAddress,
    marketName,
    borrowerLegalName: borrowerProfile.name,
    borrowerAlias: borrowerProfile.alias ?? undefined,
    networkName,
    chainId,
  })
  const verifiedSignature = await verifyAndDescribeSignature({
    provider,
    address: lenderAddress,
    message: acknowledgementText,
    signature,
  })
  if (!verifiedSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const acknowledgement = await prisma.nonMlaAcknowledgement.upsert({
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
      ...toStoredSignature(verifiedSignature),
      signature,
      acknowledgementTextVersion: NON_MLA_ACKNOWLEDGEMENT_TEXT_VERSION,
      acknowledgementText,
    },
  })

  return NextResponse.json(toResponse(acknowledgement))
}

export const dynamic = "force-dynamic"
