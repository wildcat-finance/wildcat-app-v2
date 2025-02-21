import { z } from "zod"

export const LoginInputDTO = z.object({
  address: z.string().min(2).max(42),
  signature: z.string().min(2).max(8192),
  timeSigned: z.number(),
})
