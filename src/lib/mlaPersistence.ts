import { Prisma } from "@prisma/client"

export const lockMlaAssignment = async (
  transaction: Prisma.TransactionClient,
  chainId: number,
  market: string,
) => {
  // Prisma binds JS numbers as int8, but the two-key advisory lock overload
  // is (int4, int4) and Postgres does not downcast during function
  // resolution - without the explicit cast the call fails with 42883.
  // hashtext() already returns int4.
  await transaction.$executeRaw`
    SELECT pg_advisory_xact_lock((${chainId})::int, hashtext(${market}))
  `
}

export const isPrismaUniqueConstraintError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002"
