import { NextRequest, NextResponse } from "next/server"

import { lenderKycRepository } from "@/lib/lenderKyc/server"

import { LenderKycStartInputDTO } from "../dto"
import { lenderKycErrorResponse, parseLenderKycBody } from "../respond"

export async function POST(request: NextRequest) {
  const parsed = await parseLenderKycBody(request, LenderKycStartInputDTO)
  if ("response" in parsed) return parsed.response
  try {
    return NextResponse.json(await lenderKycRepository.createStart(parsed.data))
  } catch (error) {
    return lenderKycErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
