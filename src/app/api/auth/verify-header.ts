import { sign, verify } from "jsonwebtoken"
import { NextRequest } from "next/server"

import { prisma } from "@/lib/db"

import { DataStoredInToken } from "./login/interface"

export const verifyApiToken = async (
  request: NextRequest,
): Promise<DataStoredInToken | undefined> => {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return undefined
  }
  const token = authHeader.replace("Bearer ", "")
  const user = await verify(token, process.env.SECRET_KEY as string)
  if (!user) return undefined
  return user as DataStoredInToken
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
  const expiresIn = 86_400_000_000
  const token = sign(dataStoredInToken, secretKey, { expiresIn })
  return {
    token,
    isAdmin: !!admin,
    address,
    signer: address,
  }
}
