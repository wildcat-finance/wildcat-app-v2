"use client"

import { Box, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { Markdown } from "@/components/Markdown"
import { COLORS } from "@/theme/colors"

export const MarketSummary = ({
  marketSummary,
  isLoading,
}: {
  marketSummary:
    | {
        marketAddress: string
        description: string
      }
    | undefined
  isLoading: boolean
}) => {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <Typography variant="text2" color={COLORS.santasGrey}>
        {t("lenderMarketDetails.description.states.loading")}
      </Typography>
    )
  }

  if (!marketSummary?.description || marketSummary?.description === "") {
    return (
      <Typography variant="text2" color={COLORS.santasGrey}>
        {t("lenderMarketDetails.description.states.noDescription")}
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
