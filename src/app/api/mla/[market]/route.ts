import { SpanStatusCode, trace } from "@opentelemetry/api"
import {
  getLensV2Contract,
  isSupportedChainId,
  Market,
} from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { NETWORKS_BY_ID } from "@/config/network"
import {
  getBorrowerProfile,
  getSignedMasterLoanAgreement,
  prisma,
} from "@/lib/db"
import { logger } from "@/lib/logging/server"
import { fillInMlaTemplate, getFieldValuesForBorrower } from "@/lib/mla"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"
import { validateChainIdParam } from "@/lib/validateChainIdParam"
import { getZodParseError } from "@/lib/zod-error"

import { SetMasterLoanAgreementInputDTO } from "./dto"
import {
  lastSlaUpdateTime,
  MasterLoanAgreementResponse,
  MlaTemplate,
  SetMasterLoanAgreementInput,
} from "../interface"

/// GET /api/mla/[market]?chainId=<chainId>
/// Route to get the MLA for a given market.
export async function GET(
  request: NextRequest,
  { params }: { params: { market: string } },
) {
  const tracer = trace.getTracer("wildcat-app-v2")
  return tracer.startActiveSpan("api.mla.get", async (span) => {
    const market = params.market.toLowerCase()
    try {
      const chainId = validateChainIdParam(request)
      if (!chainId) {
        span.setAttribute("mla.result", "invalid_chain_id")
        return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
      }

      span.setAttributes({
        "market.address": market,
        "market.chain_id": chainId,
      })

      const mla = await tracer.startActiveSpan(
        "mla.db.getSigned",
        async (child) => {
          try {
            return await getSignedMasterLoanAgreement(market, chainId)
          } catch (error) {
            child.recordException(error as Error)
            child.setStatus({
              code: SpanStatusCode.ERROR,
              message: error instanceof Error ? error.message : String(error),
            })
            throw error
          } finally {
            child.end()
          }
        },
      )

      if (!mla) {
        const refusal = await tracer.startActiveSpan(
          "mla.db.getRefusal",
          async (child) => {
            try {
              return await prisma.refusalToAssignMla.findFirst({
                where: {
                  chainId,
                  market,
                },
              })
            } catch (error) {
              child.recordException(error as Error)
              child.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : String(error),
              })
              throw error
            } finally {
              child.end()
            }
          },
        )
        if (refusal) {
          span.setAttributes({
            "mla.result": "refused",
            "mla.refused": true,
          })
          return NextResponse.json({ noMLA: true })
        }
        span.setAttribute("mla.result", "not_found")
        return NextResponse.json({ error: "MLA not found" }, { status: 404 })
      }

      if (!mla.borrowerSignature) {
        span.setAttributes({
          "mla.result": "missing_signature",
          "mla.has_signature": false,
        })
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: "Borrower signature missing",
        })
        // This is a 500 error because the borrower signature should always be present.
        return NextResponse.json(
          { error: "Borrower signature not found" },
          { status: 500 },
        )
      }

      span.setAttributes({
        "mla.result": "ok",
        "mla.has_signature": true,
      })
      return NextResponse.json(mla as MasterLoanAgreementResponse)
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      span.end()
    }
  })
}

/// POST /api/mla/[market]
/// Route to create a new MLA for a given market.
/// Does not require an API token because the MLA must be signed by the borrower.
/// Fails if the MLA already exists or if the borrower has refused to assign an MLA.
export async function POST(
  request: NextRequest,
  { params }: { params: { market: string } },
) {
  logger.info({ market: params.market }, "Got request to set MLA for market")
  let body: SetMasterLoanAgreementInput
  try {
    const input = await request.json()
    body = SetMasterLoanAgreementInputDTO.parse(input)
    if (!isSupportedChainId(body.chainId)) {
      return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
    }
  } catch (error) {
    return getZodParseError(error)
  }
  const marketAddress = params.market.toLowerCase()
  const provider = getProviderForServer(body.chainId)
  const codeSize = (await provider.getCode(marketAddress)).length
  const { chainId } = body
  logger.info({ marketAddress, chainId, codeSize }, "Market code size")
  logger.info(
    { marketAddress, chainId, timeSigned: body.timeSigned },
    "MLA time signed",
  )

  const refusal = await prisma.refusalToAssignMla.findFirst({
    where: {
      chainId,
      market: marketAddress,
    },
  })
  if (refusal) {
    return NextResponse.json(
      { error: "MLA assignment already declined" },
      { status: 400 },
    )
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

  if (
    await prisma.masterLoanAgreement.count({
      where: {
        chainId,
        market: marketAddress,
      },
    })
  ) {
    return NextResponse.json({ error: "MLA already exists" }, { status: 400 })
  }

  const mlaTemplate: MlaTemplate | undefined = await prisma.mlaTemplate
    .findUnique({
      where: {
        id: body.mlaTemplate,
      },
    })
    .then((obj) => {
      if (!obj) return undefined
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { isDefault, hide, description, ...rest } = obj
      return {
        ...rest,
        description: description || undefined,
        hide: hide || false,
        isDefault: isDefault || false,
      } as MlaTemplate
    })
  if (!mlaTemplate) {
    return NextResponse.json(
      { error: "MLA template not found" },
      { status: 400 },
    )
  }
  const borrowerProfile = await getBorrowerProfile(address, chainId)
  if (!borrowerProfile) {
    return NextResponse.json(
      { error: "Borrower profile not found" },
      { status: 400 },
    )
  }

  const values = getFieldValuesForBorrower({
    market,
    borrowerInfo: borrowerProfile,
    networkData: NETWORKS_BY_ID[chainId],
    timeSigned: body.timeSigned,
    lastSlaUpdateTime: +lastSlaUpdateTime,
    asset: market.underlyingToken,
  })
  const { html, plaintext, message } = fillInMlaTemplate(mlaTemplate, values)

  // writeFileSync(path.join(process.cwd(), "mla.txt"), plaintext)
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
  await prisma.$transaction([
    prisma.masterLoanAgreement.create({
      data: {
        chainId,
        market: marketAddress,
        templateId: mlaTemplate.id,
        borrower: address,
        html,
        plaintext,
        lenderFields: mlaTemplate.lenderFields,
      },
    }),
    prisma.mlaSignature.create({
      data: {
        chainId,
        market: marketAddress,
        address,
        signer: address,
        signature: body.signature,
        blockNumber:
          "blockNumber" in signature ? signature.blockNumber : undefined,
        kind: signature.kind,
        timeSigned: new Date(body.timeSigned).toISOString(),
      },
    }),
  ])
  return NextResponse.json({
    success: true,
  })
}

export const dynamic = "force-dynamic"
