import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import { MlaTemplateField } from "@/lib/mla"
import {
  canViewMlaTemplate,
  getMlaTemplateViewer,
} from "@/lib/mlaTemplateAccess"
import { isTestnetChain } from "@/lib/networkClass"
import { validateChainIdParam } from "@/lib/validateChainIdParam"
import { getZodParseError } from "@/lib/zod-error"

import {
  isAdminForNetworkClass,
  verifyApiToken,
} from "../../../auth/verify-header"
import { MlaTemplate } from "../../interface"
import { UpdateMlaTemplateInputDTO } from "../dto"

const parseTemplateId = (id: string) =>
  /^\d+$/.test(id) ? Number.parseInt(id, 10) : undefined

/// GET /api/mla/templates/[id]?chainId=<chainId>
/// Route to get the full content of an MLA template. A custom MLA is visible
/// only to its borrower (API token for this network) and to admins. A retired
/// template is still returned, with `retiredAt`, so agreements signed before
/// retirement can be checked and completed; signing refuses it after that.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const id = parseTemplateId(params.id)
  const template =
    id === undefined
      ? null
      : await prisma.mlaTemplate.findFirst({
          where: { id, isTestnet: isTestnetChain(chainId) },
          select: {
            id: true,
            isTestnet: true,
            borrowerId: true,
            name: true,
            version: true,
            description: true,
            html: true,
            plaintext: true,
            borrowerFields: true,
            lenderFields: true,
            hide: true,
            isDefault: true,
            retiredAt: true,
          },
        })
  if (
    !template ||
    !canViewMlaTemplate(template, await getMlaTemplateViewer(request, chainId))
  ) {
    return NextResponse.json(
      { error: "MLA template not found" },
      { status: 404 },
    )
  }
  const { borrowerId, version, description, retiredAt, ...rest } = template
  const response: MlaTemplate = {
    ...rest,
    borrowerId: borrowerId ?? undefined,
    version: version ?? undefined,
    description: description ?? undefined,
    retiredAt: retiredAt ?? undefined,
    borrowerFields: rest.borrowerFields as MlaTemplateField[],
    lenderFields: rest.lenderFields as MlaTemplateField[],
  }
  return NextResponse.json(response, {
    headers: { "Cache-Control": "private, no-store" },
  })
}

/// PATCH /api/mla/templates/[id]
/// Retire a custom MLA: it leaves every pick list for new markets, and every
/// market that uses it keeps its signed agreement.
/// Admin-only endpoint.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    // The only update is `{ retired: true }`.
    UpdateMlaTemplateInputDTO.parse(await request.json())
  } catch (error) {
    return getZodParseError(error)
  }
  const id = parseTemplateId(params.id)
  const template =
    id === undefined
      ? null
      : await prisma.mlaTemplate.findUnique({
          where: { id },
          select: { isTestnet: true, borrowerId: true, retiredAt: true },
        })
  if (!template) {
    return NextResponse.json(
      { error: "MLA template not found" },
      { status: 404 },
    )
  }
  if (!(await isAdminForNetworkClass(token, template.isTestnet))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!template.borrowerId) {
    return NextResponse.json(
      { error: "Only a custom MLA can be retired" },
      { status: 400 },
    )
  }
  if (!template.retiredAt) {
    await prisma.mlaTemplate.update({
      where: { id },
      data: { retiredAt: new Date() },
    })
  }
  return NextResponse.json({ success: true })
}

export const dynamic = "force-dynamic"
