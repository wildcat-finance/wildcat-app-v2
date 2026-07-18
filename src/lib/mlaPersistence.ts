import { Prisma } from "@prisma/client"

export const lockMlaAssignment = async (
  transaction: Prisma.TransactionClient,
  chainId: number,
  market: string,
) => {
  await transaction.$queryRaw`
    SELECT pg_advisory_xact_lock(${chainId}, hashtext(${market}))
  `
}

export const isPrismaUniqueConstraintError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002"
