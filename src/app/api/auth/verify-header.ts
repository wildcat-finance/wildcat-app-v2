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
    if (!user) return undefined
    return user as DataStoredInToken
  } catch (err) {
    return undefined
  }
}

export const createApiToken = async (address: string) => {
  const { SECRET_KEY } = process.env
  const admin = await prisma.adminAccount.findFirst({
    where: {
      address,
    },
  })
  const dataStoredInToken: DataStoredInToken = {
    address,
    signer: address,
    isAdmin: !!admin,
  }
  const secretKey = SECRET_KEY
  if (!secretKey) return undefined
  const expiresIn = TOKEN_TTL // 1 week
  const token = sign(dataStoredInToken, secretKey, { expiresIn })
  return {
    token,
    isAdmin: !!admin,
    address,
    signer: address,
  }
}
