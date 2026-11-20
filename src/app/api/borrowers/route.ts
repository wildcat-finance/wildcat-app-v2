import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import { isTestnetChain } from "@/lib/networkClass"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

import { BorrowerOrganisation } from "./interface"
import { isAdminForChain, verifyApiToken } from "../auth/verify-header"

/// GET /api/borrowers?chainId=<chainId>
/// Every borrowing organisation of the chain's network class, with its
/// addresses on each network of that class.
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
  const borrowers = await prisma.borrower.findMany({
    where: { isTestnet: isTestnetChain(chainId) },
    select: {
      id: true,
      isTestnet: true,
      name: true,
      alias: true,
      registrations: {
        select: { chainId: true, address: true },
        orderBy: [{ chainId: "asc" }, { address: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  })
  const response: BorrowerOrganisation[] = borrowers.map(
    ({ alias, ...borrower }) => ({ ...borrower, alias: alias ?? undefined }),
  )
  return NextResponse.json(response)
}

export const dynamic = "force-dynamic"
