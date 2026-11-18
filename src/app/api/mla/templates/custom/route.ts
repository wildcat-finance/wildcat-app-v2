import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import { isPrismaUniqueConstraintError } from "@/lib/mlaPersistence"
import { buildCustomMlaTemplate } from "@/lib/mlaTemplateText"
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
/// Every custom MLA of the network's class, retired ones included, with its
/// borrower and the number of markets that use it.
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
      borrower: { select: { id: true, name: true } },
      _count: { select: { decisions: true } },
    },
    orderBy: [{ id: "desc" }],
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
/// Register a custom MLA for one borrower: the agreement text exactly as the
/// borrower supplied it. The app adds the execution block that names the
/// borrower, the market and each lender when they sign.
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
  try {
    const template = await prisma.mlaTemplate.create({
      data: {
        isTestnet,
        borrowerId: body.borrowerId,
        name: body.name,
        version: body.version,
        description: body.description || null,
        ...buildCustomMlaTemplate(body.text),
      },
      select: { id: true },
    })
    return NextResponse.json(template)
  } catch (error) {
    if (!isPrismaUniqueConstraintError(error)) throw error
    return NextResponse.json(
      {
        error:
          "This borrower already has a custom MLA with this name and version",
      },
      { status: 409 },
    )
  }
}

export const dynamic = "force-dynamic"
