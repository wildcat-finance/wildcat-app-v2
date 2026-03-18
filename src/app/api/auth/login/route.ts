import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { getLoginSignatureMessage } from "@/config/api"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"
import { withServerSpan } from "@/lib/telemetry/serverDomainTracing"
import { getZodParseError } from "@/lib/zod-error"

import { LoginInputDTO } from "./dto"
import { LoginInput } from "./interface"
import { createApiToken } from "../verify-header"

const MAX_SIGNATURE_AGE = 3_600 // 1 hour

export async function POST(request: NextRequest) {
  return withServerSpan("api.auth.login.post", async (span) => {
    let body: LoginInput
    try {
      const input = await request.json()
      body = LoginInputDTO.parse(input)
      if (!isSupportedChainId(body.chainId)) {
        span.setAttribute("auth.result", "invalid_chain_id")
        return NextResponse.json(
          { error: "Chain ID not supported" },
          { status: 400 },
        )
      }
    } catch (error) {
      span.setAttribute("auth.result", "invalid_payload")
      return getZodParseError(error)
    }
    const address = body.address.toLowerCase()
    const { signature, timeSigned } = body
    span.setAttributes({
      "address.wallet": address,
      "market.chain_id": body.chainId,
      "operation.kind": "auth",
    })

    // Check if the signature is too old
    const unixTime = Date.now() / 1000
    if (timeSigned > unixTime || timeSigned < unixTime - MAX_SIGNATURE_AGE) {
      span.setAttribute("auth.result", "stale_signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }
    const loginMessage = getLoginSignatureMessage(address, timeSigned)
    const provider = getProviderForServer(body.chainId)
    const result = await withServerSpan("auth.signature.verify", async () =>
      verifyAndDescribeSignature({
        provider,
        signature,
        message: loginMessage,
        address,
        allowSingleSafeOwner: true,
      }),
    )

    if (!result) {
      span.setAttribute("auth.result", "invalid_signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const token = await withServerSpan("auth.token.create", async () =>
      createApiToken(address),
    )

    if (!token) {
      span.setAttribute("auth.result", "token_create_failed")
      return NextResponse.json({ error: "Server error" }, { status: 500 })
    }
    span.setAttribute("auth.result", "ok")
    return NextResponse.json(token)
  })
}

export const dynamic = "force-dynamic"
