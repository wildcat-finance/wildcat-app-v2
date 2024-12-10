import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"

import { MlaTemplate } from "../../interface"

/// GET /api/mla/templates/[id]
/// Route to get the full content of an MLA template.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: number } },
) {
  const { id } = params
  const mlaTemplate = await prisma.mlaTemplate
    .findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        html: true,
        plaintext: true,
        borrowerFields: true,
        lenderFields: true,
      },
    })
    .then((obj) => {
      if (!obj) return undefined
      const { description, ...rest } = obj
      return {
        ...rest,
        description: description || undefined,
      } as MlaTemplate
    })

  if (!mlaTemplate) {
    return NextResponse.json(
      { error: "MLA template not found" },
      { status: 404 },
    )
  }

  return NextResponse.json(mlaTemplate)
}

export const dynamic = "force-dynamic"
