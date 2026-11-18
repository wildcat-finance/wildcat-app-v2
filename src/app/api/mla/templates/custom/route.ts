import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import { isTestnetChain } from "@/lib/networkClass"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

import { isAdminForChain, verifyApiToken } from "../../../auth/verify-header"
import { CustomMlaTemplateForAdminView } from "../../interface"

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

export const dynamic = "force-dynamic"
