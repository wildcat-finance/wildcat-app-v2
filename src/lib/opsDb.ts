import { PrismaClient } from "@prisma-ops/client"

const globalForOpsPrisma = globalThis as typeof globalThis & {
  opsPrisma?: PrismaClient
}

export const opsPrisma = globalForOpsPrisma.opsPrisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production")
  globalForOpsPrisma.opsPrisma = opsPrisma

export const isOpsDatabaseConfigured = () => !!process.env.OPS_DATABASE_URL
