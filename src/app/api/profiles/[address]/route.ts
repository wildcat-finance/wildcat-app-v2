import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { getBorrowerProfile, prisma } from "@/lib/db"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

import { verifyApiToken } from "../../auth/verify-header"
import { getProfileFixture } from "../fixtures"

const PROFILE_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600"
const PROFILE_MISS_CACHE_CONTROL =
  "public, s-maxage=60, stale-while-revalidate=300"

const profileResponse = (
  profile: unknown,
  cacheControl = PROFILE_CACHE_CONTROL,
) => {
  const response = NextResponse.json({ profile })
  response.headers.set("Cache-Control", cacheControl)
  return response
}

// @todo hide borrower info if they only have a pending invite but
// have not accepted it yet

/// GET /api/profiles/[address]?chainId=<chainId>
export async function GET(
  request: NextRequest,
  { params }: { params: { address: `0x${string}` } },
) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const address = params.address.toLowerCase()
  const fixture = getProfileFixture(address, chainId)
  if (fixture) {
    return profileResponse(fixture)
  }

  // TODO: Change when real API will be ready
  const profile = await getBorrowerProfile(address, chainId)
  if (!profile) {
    return profileResponse(null, PROFILE_MISS_CACHE_CONTROL)
  }

  return profileResponse(profile)
}

// DELETE /api/profiles/[borrower | all]?chainId=<chainId>
// Test function only
export async function DELETE(
  request: NextRequest,
  { params: { address } }: { params: { address: string } },
) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!token.isAdmin || chainId !== SupportedChainId.Sepolia) {
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
      chainId,
      ...(borrower !== "all" && { address: borrower }),
    },
  })
  return NextResponse.json({ success: true, deleted: result.count })
}

export const dynamic = "force-dynamic"
