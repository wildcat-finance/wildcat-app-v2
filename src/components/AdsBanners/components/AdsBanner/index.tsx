import * as React from "react"

import { Box, SvgIcon, Typography } from "@mui/material"

import { AdsConfig } from "@/components/AdsBanners/adsConfig"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

export const AdsBanner = ({
  config,
  maxWidth,
}: {
  config: AdsConfig
  maxWidth?: string
}) => {
  const isMobile = useMobileResolution()

  const { BannerIcon } = config

  return (
    <Box
      sx={{
        maxWidth: maxWidth ?? "294px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "10px",
        borderRadius: "8px",
        background:
          "radial-gradient(74.21% 105.42% at 50.11% 14.6%, rgba(80, 80, 90, 0.70) 3.13%, rgba(28, 28, 28, 0.70) 100%), #111",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          gap: "6px",
        }}
      >
        <Typography
          variant={isMobile ? "mobText3" : "text3"}
          fontWeight={600}
          color={COLORS.staticWhite}
        >
          {config.bannerHeadline.replace("{tokenAmount}", config.tokenAmount)}
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "rgba(255, 255, 255, 0.10)",
            padding: "2px 8px 2px 3px",
            borderRadius: "20px",
          }}
        >
          <SvgIcon>
            <BannerIcon />
          </SvgIcon>

          <Typography
            variant={isMobile ? "mobText4" : "text4"}
            color={COLORS.staticWhite}
          >
            {config.bannerChipLabel}
          </Typography>
        </Box>
      </Box>

      <Typography
        variant={isMobile ? "mobText3" : "text3"}
        color={COLORS.staticWhiteAlpha80}
      >
        {config.bannerDescription.replace("{tokenAmount}", config.tokenAmount)}
      </Typography>
    </Box>
  )
}
