import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { getLoginSignatureMessage } from "@/config/api"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"
import { getZodParseError } from "@/lib/zod-error"

import { LoginInputDTO } from "./dto"
import { LoginInput } from "./interface"
import { createApiToken } from "../verify-header"

const MAX_SIGNATURE_AGE = 3_600 // 1 hour

export async function POST(request: NextRequest) {
  let body: LoginInput
  try {
    const input = await request.json()
    body = LoginInputDTO.parse(input)
    if (!isSupportedChainId(body.chainId)) {
      return NextResponse.json(
        { error: "Chain ID not supported" },
        { status: 400 },
      )
    }
  } catch (error) {
    return getZodParseError(error)
  }
  const address = body.address.toLowerCase()
  const { signature, timeSigned } = body
  // Check if the signature is too old
  const unixTime = Date.now() / 1000
  if (timeSigned > unixTime || timeSigned < unixTime - MAX_SIGNATURE_AGE) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }
  const LoginMessage = getLoginSignatureMessage(address, timeSigned)
  const provider = getProviderForServer(body.chainId)
  const result = await verifyAndDescribeSignature({
    provider,
    signature,
    message: LoginMessage,
    address,
    allowSingleSafeOwner: true,
  })

  if (!result) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const token = await createApiToken(address)

  if (!token) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
  return NextResponse.json(token)
}

export const dynamic = "force-dynamic"
