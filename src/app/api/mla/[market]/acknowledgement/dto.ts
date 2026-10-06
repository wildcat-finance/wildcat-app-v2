import { z } from "zod"

export const NonMlaAcknowledgementInputDTO = z.object({
  chainId: z.number(),
  address: z.string().min(2).max(42),
  signature: z.string().min(2).max(8192),
})
