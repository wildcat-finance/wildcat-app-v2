import { z } from "zod"

export const MarketSummaryDTO = z.object({
  marketAddress: z.string().min(2).max(42),
  description: z.string().max(2000),
})

export type MarketSummary = z.infer<typeof MarketSummaryDTO>
