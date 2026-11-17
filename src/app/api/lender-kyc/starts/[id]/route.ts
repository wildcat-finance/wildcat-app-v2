import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { lenderKycRepository } from "@/lib/lenderKyc/server"

import { LenderKycStartActionDTO } from "../../dto"
import { lenderKycErrorResponse, parseLenderKycBody } from "../../respond"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: "Unknown KYC start" }, { status: 404 })
  }
  const parsed = await parseLenderKycBody(request, LenderKycStartActionDTO)
  if ("response" in parsed) return parsed.response
  const action = parsed.data
  try {
    if (action.action === "closed") {
      await lenderKycRepository.recordClosed(params.id)
    } else if (action.action === "discard") {
      await lenderKycRepository.discardStart(params.id)
    } else if (action.action === "forward") {
      await lenderKycRepository.recordForward(params.id)
    } else {
      await lenderKycRepository.recordNotSigned(params.id, action.reason)
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return lenderKycErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
