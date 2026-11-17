import { NextRequest, NextResponse } from "next/server"

import {
  isLenderKycChainSupported,
  lenderKycRepository,
} from "@/lib/lenderKyc/server"
import { getZodParseError } from "@/lib/zod-error"

import { LenderKycStatusQueryDTO } from "../dto"
import { lenderKycErrorResponse } from "../respond"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const parsed = LenderKycStatusQueryDTO.safeParse({
    address: searchParams.get("address"),
    chainId: searchParams.get("chainId"),
  })
  if (!parsed.success) return getZodParseError(parsed.error)
  const { address, chainId } = parsed.data
  if (!isLenderKycChainSupported(chainId)) {
    return NextResponse.json(
      { error: "Chain ID not supported" },
      { status: 400 },
    )
  }
  try {
    return NextResponse.json(
      await lenderKycRepository.getWalletStatus(address, chainId),
    )
  } catch (error) {
    return lenderKycErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
