import * as React from "react"

import { Box, Skeleton, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useMarketDestinations } from "@/hooks/destinations/useDestinations"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

import { DestinationsList } from "./DestinationsList"

export const MarketDestinationsSection = ({
  chainId,
  marketAddress,
}: {
  chainId: number
  marketAddress: string
}) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()
  const { destinations, data, stale, isLoading, isError } =
    useMarketDestinations(chainId, marketAddress)

  const renderBody = () => {
    if (isLoading) {
      return (
        <Skeleton
          height="240px"
          sx={{ bgcolor: COLORS.athensGrey, borderRadius: "12px" }}
          variant="rectangular"
        />
      )
    }
    if (isError && !data) {
      return (
        <Typography
          variant={isMobile ? "mobText3" : "text3"}
          color={COLORS.santasGrey}
        >
          {t("destinations.section.error")}
        </Typography>
      )
    }
    if (destinations.length === 0) {
      return (
        <Typography
          variant={isMobile ? "mobText3" : "text3"}
          color={COLORS.santasGrey}
        >
          {t("destinations.section.empty")}
        </Typography>
      )
    }
    return (
      <DestinationsList destinations={destinations} stale={stale} columns={2} />
    )
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? "12px" : "16px",
        padding: isMobile ? "12px 16px 24px" : "12px 0 0",
        backgroundColor: isMobile ? COLORS.white : "transparent",
        borderRadius: isMobile ? "14px" : 0,
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <Typography variant={isMobile ? "mobH3" : "title3"}>
          {t("destinations.section.title")}
        </Typography>
        <Typography
          variant={isMobile ? "mobText3" : "text3"}
          color={COLORS.santasGrey}
        >
          {t("destinations.panel.subtitle")}
        </Typography>
      </Box>
      {renderBody()}
    </Box>
  )
}
