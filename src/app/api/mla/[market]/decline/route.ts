import { getLensV2Contract, Market } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { DECLINE_MLA_ASSIGNMENT_MESSAGE } from "@/config/mla-rejection"
import { TargetChainId } from "@/config/network"
import { getSignedMasterLoanAgreement, prisma } from "@/lib/db"
import { formatDate } from "@/lib/mla"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"
import { getZodParseError } from "@/lib/zod-error"

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
  } catch (error) {
    return getZodParseError(error)
  }

  const marketAddress = params.params.market.toLowerCase()
  const provider = getProviderForServer()

  const mla = await getSignedMasterLoanAgreement(marketAddress)
  if (mla) {
    return NextResponse.json({ error: "MLA already exists" }, { status: 400 })
  }

  const market = await Market.getMarket(
    TargetChainId,
    marketAddress,
    provider,
  ).catch(async () => {
    const lens = getLensV2Contract(TargetChainId, provider)
    return Market.fromMarketDataV2(
      TargetChainId,
      provider,
      await lens.getMarketData(marketAddress),
    )
  })
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
  await prisma.refusalToAssignMla.create({
    data: {
      chainId: TargetChainId,
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
  return NextResponse.json({ success: true })
}

export const dynamic = "force-dynamic"
