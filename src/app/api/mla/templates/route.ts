import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import {
  getMlaTemplateViewer,
  selectableMlaTemplatesWhere,
} from "@/lib/mlaTemplateAccess"
import { plaintextToHtml, validateTemplateFields } from "@/lib/mlaTemplateText"
import { isTestnetChain } from "@/lib/networkClass"
import { validateChainIdParam } from "@/lib/validateChainIdParam"
import { getZodParseError } from "@/lib/zod-error"

import { CreateMlaTemplateInputDTO } from "./dto"
import { isAdminForChain, verifyApiToken } from "../../auth/verify-header"
import { CreateMlaTemplateInput, MlaTemplateMetadata } from "../interface"

/// GET /api/mla/templates?chainId=<chainId>
/// The MLA templates a borrower may pick on this network: the market MLAs of
/// the network's class, plus the caller's own custom MLAs when the request
/// carries the borrower's API token for this network.
export async function GET(request: NextRequest) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const viewer = await getMlaTemplateViewer(request, chainId)
  const mlas: MlaTemplateMetadata[] = (
    await prisma.mlaTemplate.findMany({
      where: selectableMlaTemplatesWhere(
        isTestnetChain(chainId),
        viewer.borrowerId,
      ),
      select: {
        id: true,
        isTestnet: true,
        borrowerId: true,
        name: true,
        version: true,
        description: true,
        hide: true,
        isDefault: true,
      },
      orderBy: [{ id: "asc" }],
    })
  ).map(({ borrowerId, version, description, ...rest }) => ({
    ...rest,
    borrowerId: borrowerId ?? undefined,
    version: version ?? undefined,
    description: description ?? undefined,
  }))
  return NextResponse.json(mlas, {
    headers: { "Cache-Control": "private, no-store" },
  })
}

/// POST /api/mla/templates
/// Route to create a new market MLA template. Custom MLAs are registered
/// through POST /api/mla/templates/custom.
/// Admin-only endpoint.
export async function POST(request: NextRequest) {
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  let body: CreateMlaTemplateInput
  try {
    const input = await request.json()
    body = CreateMlaTemplateInputDTO.parse(input)
  } catch (error) {
    return getZodParseError(error)
  }
  if (
    !isSupportedChainId(body.chainId) ||
    !(await isAdminForChain(token, body.chainId))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { chainId, html: inputHtml, ...template } = body
  const isTestnet = isTestnetChain(chainId)
  const html = inputHtml?.trim() ? inputHtml : plaintextToHtml(body.plaintext)
  const problems = validateTemplateFields({ ...template, html })
  if (problems.length > 0) {
    return NextResponse.json(
      { error: "Invalid template fields", problems },
      { status: 400 },
    )
  }
  const mlaTemplate = await prisma.$transaction(async (tx) => {
    if (template.isDefault) {
      await tx.mlaTemplate.updateMany({
        where: {
          isTestnet,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }
    return tx.mlaTemplate.create({
      data: { ...template, html, isTestnet },
    })
  })
  return NextResponse.json(mlaTemplate)
}

export const dynamic = "force-dynamic"
