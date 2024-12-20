import { NextRequest, NextResponse } from "next/server"

import { BorrowerProfile } from "@/app/api/profiles/interface"
import { TargetChainId } from "@/config/network"
import { prisma } from "@/lib/db"

const mockProfile: BorrowerProfile = {
  address: "0x1717503EE3f56e644cf8b1058e3F83F03a71b2E1",
  name: "Wintermute LLC",
  description:
    "– leading global algorithmic trading firm and one of the largest players in digital asset markets. With an average daily trading volume of over $5bn.",
  founded: "2017",
  headquarters: "London",
  website: "https://wintermute.com/",
  twitter: "wintermute_t",
  linkedin: "https://uk.linkedin.com/company/wintermute-trading",
  jurisdiction: "UK",
  legalNature: "llc",
  companyAddress: "48 Station Road, London, N73 8QA",
  email: "example@domain.com",
  chainId: TargetChainId,
  registeredOnChain: true,
}

const otherMockedProfile: BorrowerProfile = {
  address: "0xb1099527bd2af2cf8ee3abd7dc5fa95353f31c44",
  name: "Wildcat Finance",
  description:
    "- an Ethereum protocol enabling undercollateralised on-chain credit facilities which a borrower can parameterise however they wish.",
  founded: undefined,
  headquarters: undefined,
  website: "https://wildcat.finance/",
  twitter: "WildcatFi",
  linkedin: undefined,
  jurisdiction: undefined,
  legalNature: undefined,
  companyAddress: undefined,
  email: undefined,
  chainId: TargetChainId,
  registeredOnChain: true,
}

// @todo hide borrower info if they only have a pending invite but
// have not accepted it yet

/// GET /api/profiles/[address]
export async function GET(
  request: NextRequest,
  { params }: { params: { address: `0x${string}` } },
) {
  const { address } = params
  if (address === mockProfile.address) {
    return NextResponse.json({ profile: mockProfile })
  }

  // TODO: Change when real API will be ready
  const borrower = await prisma.borrower.findFirst({
    where: {
      address: address.toLowerCase(),
      chainId: TargetChainId,
    },
  })
  if (!borrower) {
    return NextResponse.json({ profile: null }, { status: 404 })
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
      { success: false, message: "No Borrower Provided" },
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
