import { z } from "zod"

export const MAX_DESCRIPTION_LENGTH = 2000

export const MarketSummaryDTO = z.object({
  marketAddress: z.string().min(2).max(42),
  description: z.string().max(MAX_DESCRIPTION_LENGTH),
})

export type MarketSummary = z.infer<typeof MarketSummaryDTO>
