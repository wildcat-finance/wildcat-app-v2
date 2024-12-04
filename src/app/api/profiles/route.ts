import { NextRequest, NextResponse } from "next/server"

import { TargetChainId } from "@/config/network"
import { prisma } from "@/lib/db"

export async function GET() {
  const data = await prisma.borrower.findMany({
    where: {
      chainId: TargetChainId,
    },
  })
  const allProfiles = data.map((borrower) => ({
    address: borrower.address,
    chainId: borrower.chainId,
    name: borrower.name || undefined,
    description: borrower.description || undefined,
    founded: borrower.founded || undefined,
    headquarters: borrower.headquarters || undefined,
    website: borrower.website || undefined,
    twitter: borrower.twitter || undefined,
    linkedin: borrower.linkedin || undefined,
    email: borrower.email || undefined,
    registeredOnChain: borrower.registeredOnChain,
  }))

  return NextResponse.json(allProfiles)
}

export const dynamic = "force-dynamic"
