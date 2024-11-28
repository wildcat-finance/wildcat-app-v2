import { NextRequest, NextResponse } from "next/server"

import { getBorrowerProfile } from "@/lib/tmp-db"

const mockProfile = {
  address: "0x1717503EE3f56e644cf8b1058e3F83F03a71b2E1",
  name: "Wintermute",
  description:
    "– leading global algorithmic trading firm and one of the largest players in digital asset markets. With an average daily trading volume of over $5bn.",
  founded: "2017",
  headquarters: "London",
  website: "https://wintermute.com/",
  twitter: "",
  linkedin: "",
  updatedAt: 10,
}

export async function GET(
  request: NextRequest,
  { params }: { params: { address: `0x${string}` } },
) {
  const { address } = params
  const profile = getBorrowerProfile(address)
  return NextResponse.json({ profile: profile ?? mockProfile })
}
