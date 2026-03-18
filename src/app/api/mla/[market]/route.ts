import { SpanStatusCode } from "@opentelemetry/api"
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
import { withServerSpan } from "@/lib/telemetry/serverDomainTracing"
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
  const market = params.market.toLowerCase()
  return withServerSpan(
    "api.mla.get",
    async (span) => {
      const chainId = validateChainIdParam(request)
      if (!chainId) {
        span.setAttribute("mla.result", "invalid_chain_id")
        return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
      }

      span.setAttributes({
        "market.chain_id": chainId,
      })

      const mla = await withServerSpan("mla.db.get_signed", async () =>
        getSignedMasterLoanAgreement(market, chainId),
      )

      if (!mla) {
        const refusal = await withServerSpan("mla.db.get_refusal", async () =>
          prisma.refusalToAssignMla.findFirst({
            where: {
              chainId,
              market,
            },
          }),
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
    },
    {
      attributes: {
        "market.address": market,
      },
    },
  )
}

const resolveMarket = async (
  chainId: number,
  marketAddress: string,
  provider: ReturnType<typeof getProviderForServer>,
) =>
  Market.getMarket(chainId, marketAddress, provider).catch(async () => {
    const lens = getLensV2Contract(chainId, provider)
    return Market.fromMarketDataV2(
      chainId,
      provider,
      await lens.getMarketData(marketAddress),
    )
  })

/// POST /api/mla/[market]
/// Route to create a new MLA for a given market.
/// Does not require an API token because the MLA must be signed by the borrower.
/// Fails if the MLA already exists or if the borrower has refused to assign an MLA.
export async function POST(
  request: NextRequest,
  { params }: { params: { market: string } },
) {
  logger.info({ market: params.market }, "Got request to set MLA for market")
  const marketAddress = params.market.toLowerCase()
  return withServerSpan(
    "api.mla.post",
    async (span) => {
      let body: SetMasterLoanAgreementInput
      try {
        const input = await request.json()
        body = SetMasterLoanAgreementInputDTO.parse(input)
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
      span.setAttributes({
        "market.chain_id": chainId,
      })

      const provider = getProviderForServer(body.chainId)
      const codeSize = await withServerSpan(
        "mla.chain.get_market_code",
        async () => (await provider.getCode(marketAddress)).length,
      )
      logger.info({ marketAddress, chainId, codeSize }, "Market code size")
      logger.info(
        { marketAddress, chainId, timeSigned: body.timeSigned },
        "MLA time signed",
      )

      const refusal = await withServerSpan("mla.db.get_refusal", async () =>
        prisma.refusalToAssignMla.findFirst({
          where: {
            chainId,
            market: marketAddress,
          },
        }),
      )
      if (refusal) {
        span.setAttribute("mla.result", "already_declined")
        return NextResponse.json(
          { error: "MLA assignment already declined" },
          { status: 400 },
        )
      }

      const market = await withServerSpan("mla.chain.get_market", async () =>
        resolveMarket(chainId, marketAddress, provider),
      )
      const address = market.borrower.toLowerCase()
      span.setAttribute("borrower.address", address)

      const hasExistingMla = await withServerSpan(
        "mla.db.count_master_agreement",
        async () =>
          prisma.masterLoanAgreement.count({
            where: {
              chainId,
              market: marketAddress,
            },
          }),
      )
      if (hasExistingMla) {
        span.setAttribute("mla.result", "already_exists")
        return NextResponse.json(
          { error: "MLA already exists" },
          { status: 400 },
        )
      }

      const mlaTemplate = await withServerSpan(
        "mla.db.get_template",
        async () =>
          prisma.mlaTemplate
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
            }),
      )
      if (!mlaTemplate) {
        span.setAttribute("mla.result", "template_not_found")
        return NextResponse.json(
          { error: "MLA template not found" },
          { status: 400 },
        )
      }
      span.setAttribute("mla.template_id", mlaTemplate.id)

      const borrowerProfile = await withServerSpan(
        "mla.db.get_borrower_profile",
        async () => getBorrowerProfile(address, chainId),
      )
      if (!borrowerProfile) {
        span.setAttribute("mla.result", "borrower_profile_not_found")
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
      const { html, plaintext, message } = fillInMlaTemplate(
        mlaTemplate,
        values,
      )

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

      await withServerSpan("mla.db.create_master_agreement", async () =>
        prisma.$transaction([
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
                "blockNumber" in verifiedSignature
                  ? verifiedSignature.blockNumber
                  : undefined,
              kind: verifiedSignature.kind,
              timeSigned: new Date(body.timeSigned).toISOString(),
            },
          }),
        ]),
      )
      span.setAttributes({
        "mla.result": "created",
      })
      return NextResponse.json({
        success: true,
      })
    },
    {
      attributes: {
        "market.address": marketAddress,
      },
    },
  )
}

export const dynamic = "force-dynamic"
