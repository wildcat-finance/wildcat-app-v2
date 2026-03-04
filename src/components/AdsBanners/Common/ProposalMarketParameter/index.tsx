import * as React from "react"
import { ReactNode } from "react"

import { Box, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { TooltipButton } from "@/components/TooltipButton"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

export const ProposalMarketParameter = ({
  proposal,
  banner,
}: {
  proposal: ReactNode
  banner: ReactNode
}) => {
  const isMobile = useMobileResolution()
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? "10px" : "12px",
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "4px",
          }}
        >
          <Typography
            variant={isMobile ? "mobText3" : "text3"}
            color={COLORS.santasGrey}
          >
            {t("adsBanners.rewardsAPR")}
          </Typography>

          <TooltipButton value={t("adsBanners.rewardsTooltip")} />
        </Box>

        {proposal}
      </Box>

      {banner}
    </Box>
  )
}
