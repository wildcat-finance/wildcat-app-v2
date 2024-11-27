import { NextRequest, NextResponse } from "next/server"

import { getBorrowerProfile } from "@/lib/tmp-db"

export async function GET(
  request: NextRequest,
  { params }: { params: { address: `0x${string}` } },
) {
  const { address } = params
  const profile = getBorrowerProfile(address)
  return NextResponse.json({ profile: profile ?? null })
}
