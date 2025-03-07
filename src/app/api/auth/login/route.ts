import { NextRequest, NextResponse } from "next/server"

import { getLoginSignatureMessage } from "@/config/api"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"
import { getZodParseError } from "@/lib/zod-error"

import { LoginInputDTO } from "./dto"
import { LoginInput } from "./interface"
import { createApiToken } from "../verify-header"

export async function POST(request: NextRequest) {
  let body: LoginInput
  try {
    const input = await request.json()
    body = LoginInputDTO.parse(input)
  } catch (error) {
    return getZodParseError(error)
  }
  const address = body.address.toLowerCase()
  const { signature, timeSigned } = body
  const LoginMessage = getLoginSignatureMessage(address, timeSigned)
  const provider = getProviderForServer()
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
