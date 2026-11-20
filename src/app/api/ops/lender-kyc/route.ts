import { NextRequest, NextResponse } from "next/server"

import { verifyApiToken } from "@/app/api/auth/verify-header"
import {
  lenderKycErrorResponse,
  lenderKycStorageUnavailable,
  withNoStore,
} from "@/app/api/lender-kyc/respond"
import {
  isLenderKycStorageConfigured,
  lenderKycRepository,
} from "@/lib/lenderKyc/server"
import { isOpsAdmin, isOpsDatabaseConfigured } from "@/lib/opsDb"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

export const GET = withNoStore(async (request: NextRequest) => {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (token.chainId !== chainId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!isOpsDatabaseConfigured()) return lenderKycStorageUnavailable()
  try {
    if (!(await isOpsAdmin(token.address))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (!isLenderKycStorageConfigured()) return lenderKycStorageUnavailable()
    return NextResponse.json(await lenderKycRepository.listWalletRows(chainId))
  } catch (error) {
    return lenderKycErrorResponse(error)
  }
})

export const dynamic = "force-dynamic"
