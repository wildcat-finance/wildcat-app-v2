import * as React from "react"

import { Box, SvgIcon, Typography } from "@mui/material"

import { AdsConfig } from "@/components/AdsBanners/adsConfig"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

export const AdsProposalChip = ({
  config,
  isTooltip,
}: {
  config: AdsConfig
  isTooltip: boolean
}) => {
  const isMobile = useMobileResolution()

  const { ProposalIcon } = config

  return (
    <Box
      sx={{
        width: isTooltip ? "100%" : "fit-content",
        display: "flex",
        alignItems: "center",
        gap: isTooltip ? 0 : "3px",
        justifyContent: isTooltip ? "space-between" : "flex-start",
      }}
    >
      <Typography
        variant={isMobile ? "mobText4" : "text3"}
        fontWeight={isTooltip ? 600 : 500}
      >
        {config.proposalText}
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          backgroundColor: COLORS.whiteSmoke,
          padding: "2px 8px 2px 3px",
          borderRadius: "20px",
        }}
      >
        <SvgIcon>
          <ProposalIcon />
        </SvgIcon>

        <Typography variant={isMobile ? "mobText4" : "text4"}>
          {config.proposalChipLabel}
        </Typography>
      </Box>
    </Box>
  )
}
