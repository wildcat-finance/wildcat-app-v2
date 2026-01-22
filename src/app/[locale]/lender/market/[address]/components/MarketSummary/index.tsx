"use client"

import { Dispatch, SetStateAction } from "react"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { Markdown } from "@/components/Markdown"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

export const MarketSummary = ({
  marketSummary,
  isLoading,
  setIsMobileDescriptionOpen,
}: {
  marketSummary:
    | {
        marketAddress: string
        description: string
      }
    | undefined
  isLoading: boolean
  setIsMobileDescriptionOpen?: Dispatch<SetStateAction<boolean>>
}) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()

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
        padding: isMobile ? "24px 16px 12px" : "20px",
        borderRadius: "14px",
        backgroundColor: isMobile ? COLORS.white : "transparent",
        border:
          !isMobile && marketSummary && marketSummary.description !== ""
            ? `1px solid ${COLORS.athensGrey}`
            : "none",
      }}
    >
      {isMobile && <Typography variant="mobH3">Market Description</Typography>}

      <Box
        sx={{
          height: isMobile ? "335px" : "100%",
          overflow: isMobile ? "hidden" : "auto",
        }}
      >
        <Markdown markdown={marketSummary?.description || ""} />
      </Box>

      {isMobile && setIsMobileDescriptionOpen && (
        <Button
          onClick={() => setIsMobileDescriptionOpen(true)}
          variant="contained"
          color="secondary"
          size="medium"
          fullWidth
          sx={{ marginTop: "28px" }}
        >
          See more
        </Button>
      )}
    </Box>
  )
}
