import * as React from "react"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useMarketDestinations } from "@/hooks/destinations/useDestinations"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { platformNamesFor } from "@/lib/destinations/platforms"
import type { Destination } from "@/lib/destinations/types"
import { COLORS } from "@/theme/colors"

import {
  DestinationRows,
  useDestinationsCopy,
  useDestinationsHeading,
} from "./DestinationsPanel"
import { formatList } from "./format"
import { MobileDestinationsList } from "./MobileDestinationsList"

type MarketDestinationsSectionProps = {
  chainId: number
  marketAddress: string
  marketSymbol: string
  aprBips: number
}

const DesktopSectionBody = ({
  destinations,
  stale,
  marketSymbol,
  aprBips,
}: {
  destinations: Destination[]
  stale: boolean
  marketSymbol: string
  aprBips: number
}) => {
  const heading = useDestinationsHeading(marketSymbol)
  const { summary, footer } = useDestinationsCopy({
    destinations,
    stale,
    marketSymbol,
    aprBips,
  })
  const headingTextSx = {
    fontSize: "20px",
    lineHeight: "32px",
    fontWeight: 500,
    color: COLORS.blackRock,
  }

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {heading.before && (
            <Typography sx={headingTextSx}>{heading.before}</Typography>
          )}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              borderRadius: "20px",
              backgroundColor: COLORS.whiteSmoke,
            }}
          >
            <Typography variant="text1" color={COLORS.blackRock}>
              {marketSymbol}
            </Typography>
          </Box>
          {heading.after && (
            <Typography sx={headingTextSx}>{heading.after}</Typography>
          )}
        </Box>
        <Typography
          sx={{
            fontSize: "14px",
            lineHeight: "20px",
            fontWeight: 500,
            color: COLORS.blackRock,
            opacity: 0.8,
          }}
        >
          {summary}
        </Typography>
      </Box>

      <DestinationRows destinations={destinations} variant="section" />

      <Typography variant="text3" color={COLORS.matteSilver}>
        {footer}
      </Typography>
    </>
  )
}

export const MarketDestinationsSection = ({
  chainId,
  marketAddress,
  marketSymbol,
  aprBips,
}: MarketDestinationsSectionProps) => {
  const { t, i18n } = useTranslation()
  const isMobile = useMobileResolution()
  const { destinations, data, stale, isPending, isError, refetch } =
    useMarketDestinations(chainId, marketAddress)
  const platform = formatList(i18n.language, platformNamesFor(chainId))

  const renderMessage = (message: string) => (
    <Typography
      variant={isMobile ? "mobText3" : "text3"}
      color={COLORS.santasGrey}
    >
      {message}
    </Typography>
  )

  const renderState = () => {
    if (isPending) {
      return renderMessage(
        t("destinations.section.loading", {
          platform,
          interpolation: { escapeValue: false },
        }),
      )
    }
    if (isError && !data) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          {renderMessage(
            t("destinations.section.error", {
              platform,
              interpolation: { escapeValue: false },
            }),
          )}
          <Button variant="outlined" size="small" onClick={() => refetch()}>
            {t("destinations.section.tryAgain")}
          </Button>
        </Box>
      )
    }
    if (destinations.length === 0) {
      return renderMessage(t("destinations.section.empty"))
    }
    return null
  }

  const state = renderState()

  if (!isMobile) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          paddingTop: "24px",
        }}
      >
        {state ?? (
          <DesktopSectionBody
            destinations={destinations}
            stale={stale}
            marketSymbol={marketSymbol}
            aprBips={aprBips}
          />
        )}
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        padding: "24px 16px 16px",
        backgroundColor: COLORS.white,
        borderRadius: "14px",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <Typography
          variant="mobH3"
          sx={{ color: COLORS.blackRock, letterSpacing: "-0.36px" }}
        >
          {t("destinations.section.title")}
        </Typography>
        {destinations.length > 0 && (
          <Typography variant="mobText3" color={COLORS.blackRock08}>
            {t("destinations.chip", { count: destinations.length })}
          </Typography>
        )}
      </Box>
      {state ?? (
        <MobileDestinationsList destinations={destinations} stale={stale} />
      )}
    </Box>
  )
}
