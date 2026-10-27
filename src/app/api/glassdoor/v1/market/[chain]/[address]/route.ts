import { NextRequest } from "next/server"

import { prisma } from "@/lib/db"
import { readMarket } from "@/lib/glassdoor/read"
import { respond } from "@/lib/glassdoor/respond"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: { chain: string; address: string } },
) {
  return respond(request, params.chain, params.address, (chainId, address) =>
    readMarket(prisma, chainId, address),
  )
}
