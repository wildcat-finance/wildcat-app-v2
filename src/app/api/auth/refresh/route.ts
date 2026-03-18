import { NextRequest, NextResponse } from "next/server"

import { withServerSpan } from "@/lib/telemetry/serverDomainTracing"

import { createApiToken, verifyApiToken } from "../verify-header"

export async function POST(request: NextRequest) {
  return withServerSpan("api.auth.refresh.post", async (span) => {
    const token = await withServerSpan(
      "auth.token.verify_api_token",
      async () => verifyApiToken(request),
    )
    if (!token) {
      span.setAttribute("auth.result", "unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    span.setAttribute("address.wallet", token.address.toLowerCase())

    const newToken = await withServerSpan("auth.token.create", async () =>
      createApiToken(token.address),
    )
    if (!newToken) {
      span.setAttribute("auth.result", "token_create_failed")
      return NextResponse.json({ error: "Server error" }, { status: 500 })
    }

    span.setAttribute("auth.result", "ok")
    return NextResponse.json(newToken)
  })
}
