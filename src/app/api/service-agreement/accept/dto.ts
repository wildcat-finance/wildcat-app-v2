import { z } from "zod"

export const AcceptServiceAgreementInputDTO = z.object({
  address: z.string().min(2).max(42),
  chainId: z.number(),
  signature: z.string().min(2).max(8192),
  timeSigned: z.number(),
  party: z.enum(["Borrower", "Lender"]),
})
