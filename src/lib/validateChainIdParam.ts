import { isSupportedChainId, SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest } from "next/server"

export const validateChainIdParam = (
  request: NextRequest,
): SupportedChainId | undefined => {
  const { searchParams } = request.nextUrl
  if (!searchParams.has("chainId")) {
    return undefined
  }
  try {
    const chainId = Number(searchParams.get("chainId"))
    if (!isSupportedChainId(chainId)) {
      return undefined
    }
    return chainId
  } catch (error) {
    return undefined
  }
}
