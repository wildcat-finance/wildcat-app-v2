import { z } from "zod"

export const DeclineMlaRequestDTO = z.object({
  signature: z.string(),
  timeSigned: z.number(),
})
