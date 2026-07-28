import { isSupportedChainId, Market } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { DECLINE_MLA_ASSIGNMENT_MESSAGE } from "@/config/mla-rejection"
import { getSignedMasterLoanAgreement, prisma } from "@/lib/db"
import { formatDate } from "@/lib/mla"
import { lockMlaAssignment } from "@/lib/mlaPersistence"
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

  const existingRefusal = await prisma.refusalToAssignMla.findFirst({
    where: { chainId, market: marketAddress },
  })
  if (existingRefusal) {
    if (
      existingRefusal.signature === body.signature &&
      existingRefusal.timeSigned.getTime() === body.timeSigned
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

  const mla = await getSignedMasterLoanAgreement(marketAddress, chainId)
  if (mla) {
    return NextResponse.json({ error: "MLA already exists" }, { status: 400 })
  }

  const market = await Market.getMarket(chainId, marketAddress, provider).catch(
    () => Market.getMarketV2(chainId, marketAddress, provider),
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
  const result = await prisma.$transaction(
    async (transaction) => {
      await lockMlaAssignment(transaction, chainId, marketAddress)
      const [concurrentRefusal, concurrentMla] = await Promise.all([
        transaction.refusalToAssignMla.findUnique({
          where: { chainId_market: { chainId, market: marketAddress } },
        }),
        transaction.masterLoanAgreement.findUnique({
          where: { chainId_market: { chainId, market: marketAddress } },
        }),
      ])
      if (concurrentRefusal) {
        return concurrentRefusal.signature === body.signature &&
          concurrentRefusal.timeSigned.getTime() === body.timeSigned
          ? "success"
          : "refusal-conflict"
      }
      if (concurrentMla) return "mla-conflict"
      await transaction.refusalToAssignMla.create({
        data: {
          chainId,
          market: marketAddress,
          address,
          signer: signature.address,
          signature: body.signature,
          timeSigned: new Date(body.timeSigned).toISOString(),
          kind: signature.kind,
          blockNumber:
            "blockNumber" in signature ? signature.blockNumber : undefined,
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
