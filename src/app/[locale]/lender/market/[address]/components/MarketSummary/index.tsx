"use client"

import { Box, Divider, Typography } from "@mui/material"

import { Markdown } from "@/components/Markdown"
import { useMarketSummary } from "@/hooks/useMarketSummary"
import { COLORS } from "@/theme/colors"

export const MarketSummary = ({ marketAddress }: { marketAddress: string }) => {
  const { data: marketSummary, isLoading } = useMarketSummary(marketAddress)

  if (isLoading) {
    return (
      <Typography variant="text2" color={COLORS.santasGrey}>
        Loading market summary...
      </Typography>
    )
  }

  if (!marketSummary?.description || marketSummary?.description === "") {
    return (
      <Typography variant="text2" color={COLORS.santasGrey}>
        No market summary found.
      </Typography>
    )
  }

  return (
    <Box
      sx={{
        padding: "20px",
        borderRadius: "14px",
        border:
          marketSummary && marketSummary.description !== ""
            ? `1px solid ${COLORS.athensGrey}`
            : "none",
      }}
    >
      <Markdown markdown={marketSummary?.description || ""} />
    </Box>
  )
}
