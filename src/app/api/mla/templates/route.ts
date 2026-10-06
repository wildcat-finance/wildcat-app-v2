/// GET /api/mla/templates

import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import { validateChainIdParam } from "@/lib/validateChainIdParam"
import { getZodParseError } from "@/lib/zod-error"

import { CreateMlaTemplateInputDTO } from "./dto"
import { isAdminForChain, verifyApiToken } from "../../auth/verify-header"
import { CreateMlaTemplateInput, MlaTemplateMetadata } from "../interface"

/// Route to get list of all MLA templates for a chain.
export async function GET(request: NextRequest) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const mlas: MlaTemplateMetadata[] = (
    await prisma.mlaTemplate.findMany({
      where: {
        chainId,
      },
      select: {
        id: true,
        chainId: true,
        name: true,
        description: true,
        hide: true,
        isDefault: true,
      },
    })
  ).map(({ description, hide, isDefault, ...rest }) => ({
    ...rest,
    description: description || undefined,
    hide: hide || false,
    isDefault: isDefault || false,
  }))
  return NextResponse.json(mlas)
}

/// POST /api/mla/templates
/// Route to create a new MLA template.
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
  if (!(await isAdminForChain(token, body.chainId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const mlaTemplate = await prisma.$transaction(async (tx) => {
    if (body.isDefault) {
      await tx.mlaTemplate.updateMany({
        where: {
          chainId: body.chainId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }
    return tx.mlaTemplate.create({ data: body })
  })
  return NextResponse.json(mlaTemplate)
}

export const dynamic = "force-dynamic"
