import { NextRequest, NextResponse } from "next/server"

import { lenderKycRepository } from "@/lib/lenderKyc/server"
import { isOpsDatabaseConfigured } from "@/lib/opsDb"

import { LenderKycStartInputDTO } from "../dto"
import {
  lenderKycErrorResponse,
  lenderKycStorageUnavailable,
  parseLenderKycBody,
} from "../respond"

export async function POST(request: NextRequest) {
  if (!isOpsDatabaseConfigured()) return lenderKycStorageUnavailable()
  const parsed = await parseLenderKycBody(request, LenderKycStartInputDTO)
  if ("response" in parsed) return parsed.response
  try {
    return NextResponse.json(await lenderKycRepository.createStart(parsed.data))
  } catch (error) {
    return lenderKycErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
