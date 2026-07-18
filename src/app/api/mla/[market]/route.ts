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
import { fillInMlaTemplate, getFieldValuesForBorrower } from "@/lib/mla"
import { lockMlaAssignment } from "@/lib/mlaPersistence"
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
  const market = params.market.toLowerCase()
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const mla = await getSignedMasterLoanAgreement(market, chainId)
  if (!mla) {
    const refusal = await prisma.refusalToAssignMla.findFirst({
      where: {
        chainId,
        market,
      },
    })
    if (refusal) {
      return NextResponse.json({ noMLA: true })
    }
    return NextResponse.json({ error: "MLA not found" }, { status: 404 })
  }
  if (!mla.borrowerSignature) {
    // This is a 500 error because the borrower signature should always be present.
    return NextResponse.json(
      { error: "Borrower signature not found" },
      { status: 500 },
    )
  }
  return NextResponse.json(mla as MasterLoanAgreementResponse)
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

  const existingAgreement = await prisma.masterLoanAgreement.findFirst({
    where: {
      chainId,
      market: marketAddress,
    },
  })
  if (existingAgreement) {
    const existingSignature = await prisma.mlaSignature.findFirst({
      where: {
        chainId,
        market: marketAddress,
        address: existingAgreement.borrower,
      },
    })
    if (
      existingAgreement.templateId === body.mlaTemplate &&
      existingSignature?.signature === body.signature &&
      existingSignature.timeSigned.getTime() === body.timeSigned
    ) {
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: "MLA already exists" }, { status: 409 })
  }

  const provider = getProviderForServer(body.chainId)
  const codeSize = (await provider.getCode(marketAddress)).length
  console.log(`Code size for market ${marketAddress}: ${codeSize}`)
  console.log(body.timeSigned)

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

  const mlaTemplate: MlaTemplate | undefined = await prisma.mlaTemplate
    .findFirst({
      where: {
        id: body.mlaTemplate,
        chainId,
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
  const result = await prisma.$transaction(async (transaction) => {
    await lockMlaAssignment(transaction, chainId, marketAddress)
    const [concurrentAgreement, concurrentRefusal] = await Promise.all([
      transaction.masterLoanAgreement.findUnique({
        where: { chainId_market: { chainId, market: marketAddress } },
      }),
      transaction.refusalToAssignMla.findUnique({
        where: { chainId_market: { chainId, market: marketAddress } },
      }),
    ])
    if (concurrentAgreement) {
      const concurrentSignature = await transaction.mlaSignature.findFirst({
        where: { chainId, market: marketAddress, address },
      })
      return concurrentAgreement.templateId === body.mlaTemplate &&
        concurrentSignature?.signature === body.signature &&
        concurrentSignature.timeSigned.getTime() === body.timeSigned
        ? "success"
        : "mla-conflict"
    }
    if (concurrentRefusal) return "refusal-conflict"
    await transaction.masterLoanAgreement.create({
      data: {
        chainId,
        market: marketAddress,
        templateId: mlaTemplate.id,
        borrower: address,
        html,
        plaintext,
        lenderFields: mlaTemplate.lenderFields,
      },
    })
    await transaction.mlaSignature.create({
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
    })
    return "success"
  })
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
