import { NextRequest, NextResponse } from "next/server"

import {
  closeStaleLenderKycStarts,
  lenderKycRepository,
} from "@/lib/lenderKyc/server"

import { lenderKycErrorResponse } from "../respond"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (
    process.env.NODE_ENV !== "development" &&
    (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const closed = await closeStaleLenderKycStarts(lenderKycRepository)
    return NextResponse.json({ closed })
  } catch (error) {
    return lenderKycErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
