import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { getSignedMasterLoanAgreement, prisma } from "@/lib/db"
import { fillInMlaForLender, getFieldValuesForLender } from "@/lib/mla"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"
import { withServerSpan } from "@/lib/telemetry/serverDomainTracing"
import { validateChainIdParam } from "@/lib/validateChainIdParam"
import { getZodParseError } from "@/lib/zod-error"

import { LenderMlaSignatureInputDTO } from "./dto"
import { LenderMlaSignatureInput } from "./interface"
import { MlaSignatureResponse } from "../interface"

/// GET /api/mla/lender-signature?chainId=<chainId>
export async function GET(request: NextRequest) {
  return withServerSpan("api.mla.lender_signature.get", async (span) => {
    const chainId = validateChainIdParam(request)
    if (!chainId) {
      span.setAttribute("mla.result", "invalid_chain_id")
      return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
    }
    const lenderAddress = request.nextUrl.searchParams
      .get("lenderAddress")
      ?.toLowerCase()
    if (!lenderAddress) {
      span.setAttribute("mla.result", "missing_lender_address")
      return NextResponse.json(
        { error: "Lender address is required" },
        { status: 400 },
      )
    }

    span.setAttributes({
      "market.chain_id": chainId,
      "lender.address": lenderAddress,
    })

    const mlaSignatures = await withServerSpan(
      "mla.db.find_lender_signatures",
      async () =>
        prisma.mlaSignature.findMany({
          where: {
            chainId,
            address: lenderAddress,
          },
        }),
    )

    span.setAttributes({
      "mla.result": "ok",
      "mla.signature_count": mlaSignatures.length,
    })

    return NextResponse.json(
      mlaSignatures.map(
        ({ blockNumber, ...rest }) =>
          ({
            ...rest,
            blockNumber: blockNumber || undefined,
          }) as MlaSignatureResponse,
      ),
    )
  })
}

/// POST /api/mla/lender-signature
export async function POST(request: NextRequest) {
  return withServerSpan("api.mla.lender_signature.post", async (span) => {
    let body: LenderMlaSignatureInput

    try {
      const input = await request.json()
      body = LenderMlaSignatureInputDTO.parse(input)
      if (!isSupportedChainId(body.chainId)) {
        span.setAttribute("mla.result", "invalid_chain_id")
        return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
      }
    } catch (error) {
      span.setAttribute("mla.result", "invalid_payload")
      return getZodParseError(error)
    }
    const marketAddress = body.market.toLowerCase()
    const lenderAddress = body.address.toLowerCase()
    const { timeSigned, signature, chainId } = body

    span.setAttributes({
      "market.address": marketAddress,
      "market.chain_id": chainId,
      "lender.address": lenderAddress,
    })

    const signatureExists = await withServerSpan(
      "mla.db.get_lender_signature",
      async () =>
        prisma.mlaSignature.findFirst({
          where: {
            chainId,
            address: lenderAddress,
            market: marketAddress,
          },
        }),
    )
    if (signatureExists) {
      span.setAttribute("mla.result", "signature_exists")
      return NextResponse.json(
        { error: "Signature already exists" },
        { status: 400 },
      )
    }

    const mla = await withServerSpan("mla.db.get_signed", async () =>
      getSignedMasterLoanAgreement(marketAddress, chainId),
    )
    if (!mla) {
      span.setAttribute("mla.result", "mla_not_found")
      return NextResponse.json({ error: "MLA not found" }, { status: 404 })
    }
    if (!mla.borrowerSignature) {
      span.setAttribute("mla.result", "missing_borrower_signature")
      // This is a 500 error because the borrower signature should always be present.
      return NextResponse.json(
        { error: "Borrower signature not found" },
        { status: 500 },
      )
    }

    const { message } = await withServerSpan(
      "mla.render.for_lender",
      async () => {
        const values = getFieldValuesForLender(lenderAddress, timeSigned)
        return fillInMlaForLender(mla, values, marketAddress)
      },
    )

    const provider = getProviderForServer(chainId)
    const verifiedSignature = await withServerSpan(
      "mla.signature.verify",
      async () =>
        verifyAndDescribeSignature({
          provider,
          address: lenderAddress,
          message,
          signature,
        }),
    )
    if (!verifiedSignature) {
      span.setAttribute("mla.result", "invalid_signature")
      return NextResponse.json(
        { error: "Signature verification failed" },
        { status: 400 },
      )
    }

    await withServerSpan("mla.db.create_lender_signature", async () =>
      prisma.mlaSignature.create({
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
      }),
    )
    span.setAttribute("mla.result", "created")

    return NextResponse.json({
      success: true,
    })
  })
}

export const dynamic = "force-dynamic"
