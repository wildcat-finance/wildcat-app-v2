import { NextRequest, NextResponse } from "next/server"

let mockProfile = {
  address: "0x1717503EE3f56e644cf8b1058e3F83F03a71b2E1",
  name: "Wintermute LLC",
  description:
    "– leading global algorithmic trading firm and one of the largest players in digital asset markets. With an average daily trading volume of over $5bn.",
  founded: "2017",
  headquarters: "London",
  website: "https://wintermute.com/",
  twitter: "",
  linkedin: "",
  updatedAt: undefined,
}

export async function POST(request: NextRequest) {
  const data = await request.json()

  console.log(`RECEIVE POST /api/profiles/updates`)
  console.log(data)

  mockProfile = { ...mockProfile, ...data }

  return NextResponse.json({ success: true, updatedProfile: mockProfile })
}

export async function GET(request: NextRequest) {
  return NextResponse.json(mockProfile)
}
