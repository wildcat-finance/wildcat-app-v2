import { NextRequest, NextResponse } from "next/server"

import { createApiToken, verifyApiToken } from "../verify-header"

export async function POST(request: NextRequest) {
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const newToken = await createApiToken(token.address)
  if (!newToken) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
  return NextResponse.json(newToken)
}
