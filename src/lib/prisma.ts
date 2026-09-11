import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  wildcatPrisma?: PrismaClient
}

/** One PrismaClient per process (survives Next.js dev HMR module re-evaluation). */
export const prisma: PrismaClient =
  globalForPrisma.wildcatPrisma ?? new PrismaClient()
globalForPrisma.wildcatPrisma = prisma
