import { z } from "zod"

export const DeclineMlaRequestDTO = z.object({
  chainId: z.number(),
  signature: z.string(),
  timeSigned: z.number(),
})
