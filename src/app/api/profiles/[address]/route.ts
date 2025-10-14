import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { BorrowerProfile } from "@/app/api/profiles/interface"
import { TargetChainId } from "@/config/network"
import { getBorrowerProfile, prisma } from "@/lib/db"

import { verifyApiToken } from "../../auth/verify-header"

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
  entityKind: "llc",
  physicalAddress: "48 Station Road, London, N73 8QA",
  email: "example@domain.com",
  chainId: TargetChainId,
  registeredOnChain: true,
}

const otherMockedProfile: BorrowerProfile = {
  address: "0xb1099527bd2af2cf8ee3abd7dc5fa95353f31c44",
  name: "Wildcat",
  description:
    "- an Ethereum protocol enabling undercollateralised on-chain credit facilities which a borrower can parameterise however they wish.",
  founded: undefined,
  headquarters: undefined,
  website: "https://wildcat.finance/",
  twitter: "WildcatFi",
  linkedin: undefined,
  jurisdiction: undefined,
  entityKind: undefined,
  physicalAddress: undefined,
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
  const profile = await getBorrowerProfile(address)
  if (!profile) {
    return NextResponse.json({ profile: null }, { status: 404 })
  }

  return NextResponse.json({ profile })
}

// DELETE /api/profiles/[borrower | all]
// Test function only
export async function DELETE(
  request: NextRequest,
  { params: { address } }: { params: { address: string } },
) {
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!token.isAdmin || TargetChainId !== SupportedChainId.Sepolia) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
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
