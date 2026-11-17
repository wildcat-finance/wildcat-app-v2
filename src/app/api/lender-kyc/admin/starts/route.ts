import { NextRequest, NextResponse } from "next/server"

import { isAdminForChain, verifyApiToken } from "@/app/api/auth/verify-header"
import {
  closeStaleLenderKycStarts,
  isLenderKycStorageConfigured,
  lenderKycRepository,
} from "@/lib/lenderKyc/server"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

import {
  lenderKycErrorResponse,
  lenderKycStorageUnavailable,
} from "../../respond"

export async function GET(request: NextRequest) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!(await isAdminForChain(token, chainId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!isLenderKycStorageConfigured()) return lenderKycStorageUnavailable()
  try {
    await closeStaleLenderKycStarts(lenderKycRepository, chainId)
    return NextResponse.json(await lenderKycRepository.listWalletRows(chainId))
  } catch (error) {
    return lenderKycErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
