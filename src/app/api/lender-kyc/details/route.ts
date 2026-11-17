import { NextRequest, NextResponse } from "next/server"

import {
  isLenderKycStorageConfigured,
  lenderKycRepository,
  submitLenderKycDetails,
} from "@/lib/lenderKyc/server"

import { LenderKycDetailsInputDTO } from "../dto"
import {
  lenderKycErrorResponse,
  lenderKycStorageUnavailable,
  parseLenderKycBody,
} from "../respond"

export async function POST(request: NextRequest) {
  if (!isLenderKycStorageConfigured()) return lenderKycStorageUnavailable()
  const parsed = await parseLenderKycBody(request, LenderKycDetailsInputDTO)
  if ("response" in parsed) return parsed.response
  const { details, ...input } = parsed.data
  try {
    return NextResponse.json(
      await submitLenderKycDetails(lenderKycRepository, input, details),
    )
  } catch (error) {
    return lenderKycErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
