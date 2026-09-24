import { AccountKind, describeAccount } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { getProviderForServer } from "@/lib/provider"

import { createApiToken, verifyApiToken } from "../verify-header"

export async function POST(request: NextRequest) {
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (token.signer !== token.address) {
    const account = await describeAccount(
      getProviderForServer(token.chainId),
      token.address,
    )
    if (
      account.kind !== AccountKind.Safe ||
      !account.owners.some((owner) => owner.toLowerCase() === token.signer)
    ) {
      return NextResponse.json(
        { error: "The signing wallet is no longer an owner of this Safe" },
        { status: 401 },
      )
    }
  }
  const newToken = await createApiToken(
    token.address,
    token.chainId,
    token.signer,
  )
  if (!newToken) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
  return NextResponse.json(newToken)
}
