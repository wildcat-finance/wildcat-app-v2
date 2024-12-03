import { NextRequest, NextResponse } from "next/server"

import { BorrowerProfile } from "@/app/api/profiles/interface"

let mockProfile: BorrowerProfile = {
  address: "0x1717503EE3f56e644cf8b1058e3F83F03a71b2E1",
  name: "Wintermute LLC",
  description:
    "– leading global algorithmic trading firm and one of the largest players in digital asset markets. With an average daily trading volume of over $5bn.",
  founded: "2017",
  headquarters: "London",
  website: "https://wintermute.com/",
  twitter: undefined,
  linkedin: undefined,
  updatedAt: 1679616000000,
}

const otherMockedProfile = {
  address: "0xb1099527bd2af2cf8ee3abd7dc5fa95353f31c44",
  name: "Some Company",
  description: "Some Description",
  founded: undefined,
  headquarters: undefined,
  website: undefined,
  twitter: undefined,
  linkedin: undefined,
  updatedAt: 1679616000000,
}

export async function GET(
  request: NextRequest,
  { params }: { params: { address: `0x${string}` } },
) {
  const { address } = params

  if (address === mockProfile.address) {
    return NextResponse.json({ profile: mockProfile })
  }

  // TODO: Change when real API will be ready
  return NextResponse.json({ profile: otherMockedProfile })
  // return NextResponse.json({ error: "Profile not found" }, { status: 404 })
}

export async function PUT(request: NextRequest) {
  const updatedProfile = await request.json()

  if (updatedProfile.address === mockProfile.address) {
    mockProfile = { ...mockProfile, ...updatedProfile }
    return NextResponse.json({ success: true, profile: mockProfile })
  }

  return NextResponse.json({ error: "Profile not found" }, { status: 404 })
}
