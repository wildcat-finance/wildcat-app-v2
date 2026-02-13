"use client"

import { Dispatch, SetStateAction } from "react"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { Markdown } from "@/components/Markdown"
import { SeeMoreButton } from "@/components/Mobile/SeeMoreButton"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

export const MarketSummary = ({
  marketSummary,
  isLoading,
  isOpen,
  setIsOpen,
}: {
  marketSummary:
    | {
        marketAddress: string
        description: string
      }
    | undefined
  isLoading: boolean
  isOpen?: boolean
  setIsOpen?: Dispatch<SetStateAction<boolean>>
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
      <Box
        sx={{
          height: isMobile ? "335px" : "100%",
          overflow: isMobile ? "hidden" : "auto",
        }}
      >
        <Markdown markdown={marketSummary?.description || ""} />
      </Box>

      {isMobile && setIsOpen && (
        <SeeMoreButton
          variant="modal"
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          sx={{ marginTop: "28px" }}
        />
      )}
    </Box>
  )
}
