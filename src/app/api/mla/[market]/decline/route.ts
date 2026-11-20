import {
  getLensV2Contract,
  isSupportedChainId,
  Market,
} from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { DECLINE_MLA_ASSIGNMENT_MESSAGE } from "@/config/mla-rejection"
import { findBorrowerRegistration, prisma } from "@/lib/db"
import { formatDate } from "@/lib/mla"
import { lockMlaAssignment, toStoredSignature } from "@/lib/mlaPersistence"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"
import { getZodParseError } from "@/lib/zod-error"
import { isServiceAgreementTimeSignedInBounds } from "@/utils/serviceAgreementMessage"

import { DeclineMlaRequestDTO } from "./dto"
import { DeclineMlaRequest } from "./interface"

/// Route to decline assigning an MLA to a market
export const POST = async (
  request: NextRequest,
  params: { params: { market: string } },
) => {
  let body: DeclineMlaRequest
  try {
    const input = await request.json()
    body = DeclineMlaRequestDTO.parse(input)
    if (!isSupportedChainId(body.chainId)) {
      return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
    }
  } catch (error) {
    return getZodParseError(error)
  }
  const { chainId } = body
  const marketAddress = params.params.market.toLowerCase()
  const provider = getProviderForServer(chainId)

  const existingDecision = await prisma.marketMlaDecision.findUnique({
    where: { chainId_market: { chainId, market: marketAddress } },
  })
  if (existingDecision?.outcome === "Declined") {
    if (
      existingDecision.signature === body.signature &&
      existingDecision.timeSigned.getTime() === body.timeSigned
    ) {
      return NextResponse.json({ success: true })
    }
    return NextResponse.json(
      { error: "MLA assignment already declined" },
      { status: 409 },
    )
  }

  // MLA signing shares the ToU ceremony window: after the idempotent-replay
  // check so retries of an already-stored action still succeed; before
  // verification so a new record can only claim a signing time the server
  // clock roughly agrees with.
  if (!isServiceAgreementTimeSignedInBounds(body.timeSigned)) {
    return NextResponse.json(
      { error: "timeSigned is outside the accepted signing window" },
      { status: 400 },
    )
  }

  if (existingDecision) {
    return NextResponse.json({ error: "MLA already exists" }, { status: 400 })
  }

  const market = await Market.getMarket(chainId, marketAddress, provider).catch(
    async () => {
      const lens = getLensV2Contract(chainId, provider)
      return Market.fromMarketDataV2(
        chainId,
        provider,
        await lens.getMarketData(marketAddress),
      )
    },
  )
  const address = market.borrower.toLowerCase()

  const message = DECLINE_MLA_ASSIGNMENT_MESSAGE.replace(
    "{{market}}",
    marketAddress,
  ).replace("{{timeSigned}}", formatDate(body.timeSigned)!)

  const signature = await verifyAndDescribeSignature({
    provider,
    address,
    allowSingleSafeOwner: false,
    message,
    signature: body.signature,
  })
  if (!signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }
  const registration = await findBorrowerRegistration(chainId, address)
  const result = await prisma.$transaction(
    async (transaction) => {
      await lockMlaAssignment(transaction, chainId, marketAddress)
      const concurrentDecision = await transaction.marketMlaDecision.findUnique(
        { where: { chainId_market: { chainId, market: marketAddress } } },
      )
      if (concurrentDecision?.outcome === "Assigned") return "mla-conflict"
      if (concurrentDecision) {
        return concurrentDecision.signature === body.signature &&
          concurrentDecision.timeSigned.getTime() === body.timeSigned
          ? "success"
          : "refusal-conflict"
      }
      await transaction.marketMlaDecision.create({
        data: {
          chainId,
          market: marketAddress,
          outcome: "Declined",
          // A refusal may come from an account with no borrower record.
          borrowerId: registration?.borrowerId ?? null,
          borrowerAddress: address,
          ...toStoredSignature(signature),
          signature: body.signature,
          timeSigned: new Date(body.timeSigned),
        },
      })
      return "success"
    },
    { timeout: 15_000 },
  )
  if (result === "refusal-conflict") {
    return NextResponse.json(
      { error: "MLA assignment already declined" },
      { status: 409 },
    )
  }
  if (result === "mla-conflict") {
    return NextResponse.json({ error: "MLA already exists" }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

export const dynamic = "force-dynamic"
