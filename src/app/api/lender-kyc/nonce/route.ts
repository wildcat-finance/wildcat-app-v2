import { NextRequest, NextResponse } from "next/server"

import {
  isLenderKycStorageConfigured,
  issueLenderKycNonce,
  lenderKycRepository,
} from "@/lib/lenderKyc/server"

import { LenderKycNonceInputDTO } from "../dto"
import {
  lenderKycErrorResponse,
  lenderKycStorageUnavailable,
  parseLenderKycBody,
} from "../respond"

export async function POST(request: NextRequest) {
  if (!isLenderKycStorageConfigured()) return lenderKycStorageUnavailable()
  const parsed = await parseLenderKycBody(request, LenderKycNonceInputDTO)
  if ("response" in parsed) return parsed.response
  try {
    const { nonce, secret, expiresAt } = await issueLenderKycNonce(
      lenderKycRepository,
      parsed.data.address,
      parsed.data.chainId,
    )
    return NextResponse.json({
      nonce,
      secret,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    return lenderKycErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
