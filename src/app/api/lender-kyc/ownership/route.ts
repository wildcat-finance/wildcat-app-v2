import { NextRequest, NextResponse } from "next/server"

import {
  confirmLenderKycOwnership,
  isLenderKycStorageConfigured,
  lenderKycRepository,
} from "@/lib/lenderKyc/server"

import { LenderKycSignedInputDTO } from "../dto"
import {
  lenderKycErrorResponse,
  lenderKycStorageUnavailable,
  parseLenderKycBody,
  withNoStore,
} from "../respond"

export const POST = withNoStore(async (request: NextRequest) => {
  if (!isLenderKycStorageConfigured()) return lenderKycStorageUnavailable()
  const parsed = await parseLenderKycBody(request, LenderKycSignedInputDTO)
  if ("response" in parsed) return parsed.response
  try {
    return NextResponse.json(
      await confirmLenderKycOwnership(lenderKycRepository, parsed.data),
    )
  } catch (error) {
    return lenderKycErrorResponse(error)
  }
})

export const dynamic = "force-dynamic"
