import { NextResponse } from "next/server"
import { z } from "zod"

import {
  isLenderKycChainSupported,
  toLenderKycErrorResponse,
} from "@/lib/lenderKyc/server"
import { getZodParseError } from "@/lib/zod-error"

export const parseLenderKycBody = async <T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<{ data: z.output<T> } | { response: NextResponse }> => {
  try {
    const data = schema.parse(await request.json())
    if (
      typeof data === "object" &&
      data !== null &&
      "chainId" in data &&
      !isLenderKycChainSupported(Number(data.chainId))
    ) {
      return {
        response: NextResponse.json(
          { error: "Chain ID not supported" },
          { status: 400 },
        ),
      }
    }
    return { data }
  } catch (error) {
    return { response: getZodParseError(error) }
  }
}

export const lenderKycErrorResponse = (error: unknown) => {
  const { status, body } = toLenderKycErrorResponse(error)
  return NextResponse.json(body, { status })
}

export const lenderKycStorageUnavailable = () =>
  NextResponse.json({ error: "KYC storage is not configured" }, { status: 503 })
