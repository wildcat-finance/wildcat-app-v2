import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import { MlaTemplateField } from "@/lib/mla"
import { isPrismaUniqueConstraintError } from "@/lib/mlaPersistence"
import { prepareCustomMlaTemplate } from "@/lib/mlaTemplateText"
import { isTestnetChain } from "@/lib/networkClass"
import { validateChainIdParam } from "@/lib/validateChainIdParam"
import { getZodParseError } from "@/lib/zod-error"

import { isAdminForChain, verifyApiToken } from "../../../auth/verify-header"
import {
  CreateCustomMlaInput,
  CustomMlaTemplateForAdminView,
} from "../../interface"
import { CreateCustomMlaInputDTO } from "../dto"

/// GET /api/mla/templates/custom?chainId=<chainId>
/// Every custom MLA of the network's class, retired ones included, newest
/// first, with its borrower and the number of markets that use it.
/// Admin-only endpoint.
export async function GET(request: NextRequest) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!(await isAdminForChain(token, chainId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const templates = await prisma.mlaTemplate.findMany({
    where: { isTestnet: isTestnetChain(chainId), borrowerId: { not: null } },
    select: {
      id: true,
      isTestnet: true,
      name: true,
      version: true,
      description: true,
      retiredAt: true,
      createdAt: true,
      borrower: { select: { id: true, name: true } },
      _count: { select: { decisions: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })
  const response: CustomMlaTemplateForAdminView[] = templates.flatMap(
    ({ borrower, version, description, retiredAt, _count, ...template }) =>
      borrower && version
        ? [
            {
              ...template,
              borrowerId: borrower.id,
              borrowerName: borrower.name,
              version,
              description: description ?? undefined,
              retiredAt: retiredAt ?? undefined,
              marketCount: _count.decisions,
            },
          ]
        : [],
  )
  return NextResponse.json(response)
}

/// POST /api/mla/templates/custom
/// Register a custom MLA for one borrower: the HTML and plain text of the
/// borrower's copy of the market MLA, as edited in the admin dialog. Its
/// `{{field}}` placeholders become the template's fields, labelled as the
/// class's market MLA labels them, and are filled in at signing exactly as the
/// market MLA's are. Its version must be new for the borrower, retired custom
/// MLAs included, whatever their names.
/// Admin-only endpoint.
export async function POST(request: NextRequest) {
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  let body: CreateCustomMlaInput
  try {
    body = CreateCustomMlaInputDTO.parse(await request.json())
  } catch (error) {
    return getZodParseError(error)
  }
  if (
    !isSupportedChainId(body.chainId) ||
    !(await isAdminForChain(token, body.chainId))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const isTestnet = isTestnetChain(body.chainId)
  const borrower = await prisma.borrower.findUnique({
    where: { id: body.borrowerId },
    select: { isTestnet: true },
  })
  if (!borrower || borrower.isTestnet !== isTestnet) {
    return NextResponse.json(
      { error: `Borrower ${body.borrowerId} not found for this network` },
      { status: 400 },
    )
  }
  const marketMla = await prisma.mlaTemplate.findFirst({
    where: { isTestnet, borrowerId: null, retiredAt: null },
    select: { borrowerFields: true, lenderFields: true },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  })
  const { template, problems } = prepareCustomMlaTemplate(
    body,
    marketMla
      ? {
          borrowerFields: marketMla.borrowerFields as MlaTemplateField[],
          lenderFields: marketMla.lenderFields as MlaTemplateField[],
        }
      : undefined,
  )
  if (problems.length > 0) {
    return NextResponse.json(
      { error: "Invalid template fields", problems },
      { status: 400 },
    )
  }
  try {
    const created = await prisma.mlaTemplate.create({
      data: {
        isTestnet,
        borrowerId: body.borrowerId,
        name: body.name,
        version: body.version,
        description: body.description || null,
        ...template,
      },
      select: { id: true },
    })
    return NextResponse.json(created)
  } catch (error) {
    if (!isPrismaUniqueConstraintError(error)) throw error
    return NextResponse.json(
      {
        error: `This borrower already has a custom MLA with version ${body.version}`,
      },
      { status: 409 },
    )
  }
}

export const dynamic = "force-dynamic"
