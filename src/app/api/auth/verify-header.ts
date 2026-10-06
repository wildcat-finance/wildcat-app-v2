import { isSupportedChainId, SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { sign, verify } from "jsonwebtoken"
import { NextRequest } from "next/server"

import { prisma } from "@/lib/db"

import { DataStoredInToken } from "./login/interface"

const TOKEN_TTL = 604_800 // 1 week

export const verifyApiToken = async (
  request: NextRequest,
): Promise<DataStoredInToken | undefined> => {
  const { SECRET_KEY } = process.env
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return undefined
  }
  const token = authHeader.replace("Bearer ", "")
  const secretKey = SECRET_KEY
  if (!secretKey) return undefined
  try {
    const user = verify(token, secretKey)
    if (!user || typeof user !== "object") return undefined
    const { address, signer, isAdmin, chainId } =
      user as Partial<DataStoredInToken>
    if (
      typeof address !== "string" ||
      typeof signer !== "string" ||
      typeof isAdmin !== "boolean" ||
      typeof chainId !== "number" ||
      !isSupportedChainId(chainId)
    ) {
      return undefined
    }
    return {
      address: address.toLowerCase(),
      signer: signer.toLowerCase(),
      isAdmin,
      chainId,
    }
  } catch (err) {
    return undefined
  }
}

export const isAdminForChain = async (
  token: DataStoredInToken | undefined,
  chainId: SupportedChainId,
) => {
  if (!token?.isAdmin || token.chainId !== chainId) return false
  const admin = await prisma.adminAccount.findFirst({
    where: {
      chainId,
      address: token.address.toLowerCase(),
    },
  })
  return !!admin
}

export const createApiToken = async (
  address: string,
  chainId: SupportedChainId,
) => {
  const { SECRET_KEY } = process.env
  const normalizedAddress = address.toLowerCase()
  const admin = await prisma.adminAccount.findFirst({
    where: {
      chainId,
      address: normalizedAddress,
    },
  })
  const dataStoredInToken: DataStoredInToken = {
    address: normalizedAddress,
    signer: normalizedAddress,
    isAdmin: !!admin,
    chainId,
  }
  const secretKey = SECRET_KEY
  if (!secretKey) return undefined
  const expiresIn = TOKEN_TTL // 1 week
  const token = sign(dataStoredInToken, secretKey, { expiresIn })
  return {
    token,
    isAdmin: !!admin,
    address: normalizedAddress,
    signer: normalizedAddress,
    chainId,
  }
}
