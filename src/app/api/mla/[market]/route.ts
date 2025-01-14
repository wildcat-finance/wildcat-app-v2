import { writeFileSync } from "fs"
import path from "path"

import { getLensV2Contract, Market } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { TargetChainId, TargetNetwork } from "@/config/network"
import { getSignedMasterLoanAgreement, prisma } from "@/lib/db"
import {
  BasicBorrowerInfo,
  fillInMlaTemplate,
  getFieldValuesForBorrower,
} from "@/lib/mla"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"
import { getZodParseError } from "@/lib/zod-error"

import { SetMasterLoanAgreementInputDTO } from "./dto"
import {
  lastSlaUpdateTime,
  MasterLoanAgreementResponse,
  MlaTemplate,
  SetMasterLoanAgreementInput,
} from "../interface"

/// GET /api/mla/[market]
/// Route to get the MLA for a given market.
export async function GET(
  request: NextRequest,
  { params }: { params: { market: string } },
) {
  const market = params.market.toLowerCase()
  const mla = await getSignedMasterLoanAgreement(market)
  if (!mla) {
    const refusal = await prisma.refusalToAssignMla.findFirst({
      where: {
        chainId: TargetChainId,
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
  } catch (error) {
    return getZodParseError(error)
  }
  const marketAddress = params.market.toLowerCase()
  const provider = getProviderForServer()
  const codeSize = (await provider.getCode(marketAddress)).length
  console.log(`Code size for market ${marketAddress}: ${codeSize}`)
  console.log(body.timeSigned)

  const refusal = await prisma.refusalToAssignMla.findFirst({
    where: {
      chainId: TargetChainId,
      market: marketAddress,
    },
  })
  if (refusal) {
    return NextResponse.json(
      { error: "MLA assignment already declined" },
      { status: 400 },
    )
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

  if (
    await prisma.masterLoanAgreement.count({
      where: {
        chainId: TargetChainId,
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
      const { isDefault, description, ...rest } = obj
      return {
        ...rest,
        description: description || undefined,
      } as MlaTemplate
    })
  if (!mlaTemplate) {
    return NextResponse.json(
      { error: "MLA template not found" },
      { status: 400 },
    )
  }
  const borrowerProfile = await prisma.borrower.findFirst({
    where: {
      address,
      chainId: TargetChainId,
    },
  })
  if (!borrowerProfile) {
    return NextResponse.json(
      { error: "Borrower profile not found" },
      { status: 400 },
    )
  }

  const values = getFieldValuesForBorrower(
    market,
    borrowerProfile as BasicBorrowerInfo,
    TargetNetwork,
    body.timeSigned,
    +lastSlaUpdateTime,
  )
  const { html, plaintext } = fillInMlaTemplate(mlaTemplate, values)
  writeFileSync(path.join(process.cwd(), "mla.txt"), plaintext)
  const signature = await verifyAndDescribeSignature({
    provider,
    address,
    allowSingleSafeOwner: false,
    message: plaintext,
    signature: body.signature,
  })
  if (!signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }
  await prisma.$transaction([
    prisma.masterLoanAgreement.create({
      data: {
        chainId: TargetChainId,
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
        chainId: TargetChainId,
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
