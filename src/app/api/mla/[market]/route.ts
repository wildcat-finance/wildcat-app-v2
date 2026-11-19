import {
  getLensV2Contract,
  isSupportedChainId,
  Market,
} from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { NETWORKS_BY_ID } from "@/config/network"
import {
  findBorrowerRegistration,
  getMarketMlaDecision,
  prisma,
  toBorrowerProfile,
  toMasterLoanAgreementResponse,
} from "@/lib/db"
import {
  fillInMlaTemplate,
  getFieldValuesForBorrower,
  MlaTemplateField,
} from "@/lib/mla"
import { lockMlaAssignment, toStoredSignature } from "@/lib/mlaPersistence"
import { canSelectMlaTemplate } from "@/lib/mlaTemplateAccess"
import { isTestnetChain } from "@/lib/networkClass"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"
import { validateChainIdParam } from "@/lib/validateChainIdParam"
import { getZodParseError } from "@/lib/zod-error"
import { isServiceAgreementTimeSignedInBounds } from "@/utils/serviceAgreementMessage"

import { SetMasterLoanAgreementInputDTO } from "./dto"
import { lastSlaUpdateTime, SetMasterLoanAgreementInput } from "../interface"

/// GET /api/mla/[market]?chainId=<chainId>
/// Route to get the MLA for a given market.
export async function GET(
  request: NextRequest,
  { params }: { params: { market: string } },
) {
  const market = params.market.toLowerCase()
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const decision = await getMarketMlaDecision(market, chainId)
  if (!decision) {
    return NextResponse.json({ error: "MLA not found" }, { status: 404 })
  }
  if (decision.outcome === "Declined") {
    return NextResponse.json({ noMLA: true })
  }
  return NextResponse.json(toMasterLoanAgreementResponse(decision))
}

/// POST /api/mla/[market]
/// Route to create a new MLA for a given market.
/// Does not require an API token because the MLA must be signed by the borrower.
/// Fails if the MLA already exists or if the borrower has refused to assign an MLA.
export async function POST(
  request: NextRequest,
  { params }: { params: { market: string } },
) {
  console.log(`Got request to set MLA for market ${params.market}`)
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
  const { chainId } = body

  const existingDecision = await prisma.marketMlaDecision.findUnique({
    where: { chainId_market: { chainId, market: marketAddress } },
  })
  if (existingDecision?.outcome === "Assigned") {
    if (
      existingDecision.templateId === body.mlaTemplate &&
      existingDecision.signature === body.signature &&
      existingDecision.timeSigned.getTime() === body.timeSigned
    ) {
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: "MLA already exists" }, { status: 409 })
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

  const provider = getProviderForServer(body.chainId)
  const codeSize = (await provider.getCode(marketAddress)).length
  console.log(`Code size for market ${marketAddress}: ${codeSize}`)

  if (existingDecision?.outcome === "Declined") {
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

  const template = await prisma.mlaTemplate.findFirst({
    where: {
      id: body.mlaTemplate,
      isTestnet: isTestnetChain(chainId),
    },
  })
  if (!template) {
    return NextResponse.json(
      { error: "MLA template not found" },
      { status: 400 },
    )
  }
  const registration = await findBorrowerRegistration(chainId, address)
  if (!registration) {
    return NextResponse.json(
      { error: "Borrower profile not found" },
      { status: 400 },
    )
  }
  // A custom MLA belongs to one borrower, and a retired template takes no
  // agreement signed after it was retired. The pick lists only present this;
  // here it is enforced.
  if (
    !canSelectMlaTemplate(template, registration.borrowerId, body.timeSigned)
  ) {
    return NextResponse.json(
      { error: "MLA template not available to this borrower" },
      { status: 400 },
    )
  }
  const mlaTemplate = {
    html: template.html,
    plaintext: template.plaintext,
    borrowerFields: template.borrowerFields as MlaTemplateField[],
    lenderFields: template.lenderFields as MlaTemplateField[],
  }
  const borrowerProfile = toBorrowerProfile(
    registration.address,
    registration.chainId,
    registration.registeredOnChain,
    registration.borrower,
  )

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
  const result = await prisma.$transaction(
    async (transaction) => {
      await lockMlaAssignment(transaction, chainId, marketAddress)
      const concurrentDecision = await transaction.marketMlaDecision.findUnique(
        { where: { chainId_market: { chainId, market: marketAddress } } },
      )
      if (concurrentDecision?.outcome === "Declined") return "refusal-conflict"
      if (concurrentDecision) {
        return concurrentDecision.templateId === body.mlaTemplate &&
          concurrentDecision.signature === body.signature &&
          concurrentDecision.timeSigned.getTime() === body.timeSigned
          ? "success"
          : "mla-conflict"
      }
      await transaction.marketMlaDecision.create({
        data: {
          chainId,
          market: marketAddress,
          outcome: "Assigned",
          borrowerId: registration.borrowerId,
          borrowerAddress: address,
          ...toStoredSignature(signature),
          signature: body.signature,
          timeSigned: new Date(body.timeSigned),
          templateId: template.id,
          html,
          plaintext,
          lenderFields: mlaTemplate.lenderFields,
        },
      })
      return "success"
    },
    { timeout: 15_000 },
  )
  if (result === "mla-conflict") {
    return NextResponse.json({ error: "MLA already exists" }, { status: 409 })
  }
  if (result === "refusal-conflict") {
    return NextResponse.json(
      { error: "MLA assignment already declined" },
      { status: 400 },
    )
  }
  return NextResponse.json({
    success: true,
  })
}

export const dynamic = "force-dynamic"
