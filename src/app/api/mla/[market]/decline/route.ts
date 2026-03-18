import {
  getLensV2Contract,
  isSupportedChainId,
  Market,
} from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { DECLINE_MLA_ASSIGNMENT_MESSAGE } from "@/config/mla-rejection"
import { getSignedMasterLoanAgreement, prisma } from "@/lib/db"
import { formatDate } from "@/lib/mla"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"
import { withServerSpan } from "@/lib/telemetry/serverDomainTracing"
import { getZodParseError } from "@/lib/zod-error"

import { DeclineMlaRequestDTO } from "./dto"
import { DeclineMlaRequest } from "./interface"

/// Route to decline assigning an MLA to a market
export const POST = async (
  request: NextRequest,
  params: { params: { market: string } },
) => {
  const marketAddress = params.params.market.toLowerCase()

  return withServerSpan(
    "api.mla.decline.post",
    async (span) => {
      let body: DeclineMlaRequest
      try {
        const input = await request.json()
        body = DeclineMlaRequestDTO.parse(input)
        if (!isSupportedChainId(body.chainId)) {
          span.setAttribute("mla.result", "invalid_chain_id")
          return NextResponse.json(
            { error: "Invalid chain ID" },
            { status: 400 },
          )
        }
      } catch (error) {
        span.setAttribute("mla.result", "invalid_payload")
        return getZodParseError(error)
      }

      const { chainId } = body
      const provider = getProviderForServer(chainId)
      span.setAttribute("market.chain_id", chainId)

      const mla = await withServerSpan("mla.db.get_signed", async () =>
        getSignedMasterLoanAgreement(marketAddress, chainId),
      )
      if (mla) {
        span.setAttribute("mla.result", "already_exists")
        return NextResponse.json(
          { error: "MLA already exists" },
          { status: 400 },
        )
      }

      const market = await withServerSpan("mla.chain.get_market", async () =>
        Market.getMarket(chainId, marketAddress, provider).catch(async () => {
          const lens = getLensV2Contract(chainId, provider)
          return Market.fromMarketDataV2(
            chainId,
            provider,
            await lens.getMarketData(marketAddress),
          )
        }),
      )
      const address = market.borrower.toLowerCase()
      span.setAttribute("borrower.address", address)

      const message = DECLINE_MLA_ASSIGNMENT_MESSAGE.replace(
        "{{market}}",
        marketAddress,
      ).replace("{{timeSigned}}", formatDate(body.timeSigned)!)

      const verifiedSignature = await withServerSpan(
        "mla.signature.verify",
        async () =>
          verifyAndDescribeSignature({
            provider,
            address,
            allowSingleSafeOwner: false,
            message,
            signature: body.signature,
          }),
      )
      if (!verifiedSignature) {
        span.setAttribute("mla.result", "invalid_signature")
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 400 },
        )
      }

      await withServerSpan("mla.db.create_refusal", async () =>
        prisma.refusalToAssignMla.create({
          data: {
            chainId,
            market: marketAddress,
            address,
            signer: verifiedSignature.address,
            signature: body.signature,
            timeSigned: new Date(body.timeSigned).toISOString(),
            kind: verifiedSignature.kind,
            blockNumber:
              "blockNumber" in verifiedSignature
                ? verifiedSignature.blockNumber
                : undefined,
          },
        }),
      )
      span.setAttribute("mla.result", "declined")
      return NextResponse.json({ success: true })
    },
    {
      attributes: {
        "market.address": marketAddress,
      },
    },
  )
}

export const dynamic = "force-dynamic"
