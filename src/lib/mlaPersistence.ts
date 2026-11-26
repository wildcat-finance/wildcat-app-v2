import { Prisma } from "@prisma/client"

import { VerifiedSignature } from "@/lib/signatures/interface"

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

/// The stored evidence of a verified signature. `signer` is the account that
/// produced it: the Safe owner for a single-owner signature, otherwise the
/// signing account itself. A block number exists only for contract checks.
export const toStoredSignature = (verified: VerifiedSignature) => ({
  signer: (verified.kind === "GnosisOwnerECDSA"
    ? verified.owner
    : verified.address
  ).toLowerCase(),
  kind: verified.kind,
  blockNumber: "blockNumber" in verified ? verified.blockNumber : null,
})
