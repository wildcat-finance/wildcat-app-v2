import { NextRequest, NextResponse } from "next/server"

import { TargetChainId } from "@/config/network"
import { prisma } from "@/lib/db"

import { BorrowerProfile } from "../interface"

/// GET /api/profiles/[address]
export async function GET(
  request: NextRequest,
  { params }: { params: { address: `0x${string}` } },
) {
  const { address } = params
  const borrower = await prisma.borrower.findFirst({
    where: {
      address: address.toLowerCase(),
      chainId: TargetChainId,
    },
  })
  if (!borrower) {
    return NextResponse.json({ profile: null })
  }
  const profile: BorrowerProfile = {
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
  }
  return NextResponse.json({ profile })
}

// DELETE /api/profiles/[borrower | all]
// Test function only
export async function DELETE(
  request: NextRequest,
  { params: { address } }: { params: { address: string } },
) {
  const borrower = address
  if (!borrower) {
    return NextResponse.json(
      { success: false, message: "No borrower provided" },
      { status: 400 },
    )
  }
  const result = await prisma.borrower.deleteMany({
    where: {
      chainId: TargetChainId,
      ...(borrower !== "all" && { address: borrower }),
    },
  })
  return NextResponse.json({ success: true, deleted: result.count })
}

export const dynamic = "force-dynamic"
