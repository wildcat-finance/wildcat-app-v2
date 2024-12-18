import { z } from "zod"

export const LenderMlaSignatureInputDTO = z.object({
  market: z.string().min(2).max(42),
  address: z.string().min(2).max(42),
  signature: z.string().min(2).max(8192),
  timeSigned: z.number(),
})
