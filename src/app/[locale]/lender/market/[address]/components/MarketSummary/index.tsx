"use client"

import { Divider, Typography } from "@mui/material"

import { Markdown } from "@/components/Markdown"
import { useMarketSummary } from "@/hooks/useMarketSummary"

export const MarketSummary = ({ marketAddress }: { marketAddress: string }) => {
  const { data: marketSummary, isLoading } = useMarketSummary(marketAddress)

  if (isLoading) {
    return null
  }

  if (!marketSummary?.description) {
    return null
  }

  return (
    <>
      <Typography variant="title2">Market Summary</Typography>
      <Markdown markdown={marketSummary?.description || ""} />
      <Divider sx={{ margin: "32px 0" }} />
    </>
  )
}
