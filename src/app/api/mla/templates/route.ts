/// GET /api/mla/templates

import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import { getZodParseError } from "@/lib/zod-error"

import { CreateMlaTemplateInputDTO } from "./dto"
import { verifyApiToken } from "../../auth/verify-header"
import { CreateMlaTemplateInput, MlaTemplateMetadata } from "../interface"

/// Route to get list of all MLA templates.
export async function GET() {
  const mlas: MlaTemplateMetadata[] = (
    await prisma.mlaTemplate.findMany({
      select: {
        id: true,
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
  if (!token?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  let body: CreateMlaTemplateInput
  try {
    const input = await request.json()
    body = CreateMlaTemplateInputDTO.parse(input)
  } catch (error) {
    return getZodParseError(error)
  }
  const mlaTemplate = await prisma.mlaTemplate.create({ data: body })
  return NextResponse.json(mlaTemplate)
}

export const dynamic = "force-dynamic"
