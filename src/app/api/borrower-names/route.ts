import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

/// GET /api/borrower-names?chainId=1
export async function GET(request: NextRequest) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const names = (
    await prisma.borrower.findMany({
      where: {
        chainId,
      },
      select: {
        name: true,
        alias: true,
        address: true,
      },
    })
  ).map(({ name, alias, address }) => ({
    address,
    name: alias || name || undefined,
  }))
  return NextResponse.json(names)
}
