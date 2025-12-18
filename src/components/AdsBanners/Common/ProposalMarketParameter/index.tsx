import * as React from "react"
import { ReactNode } from "react"

import { Box, Typography } from "@mui/material"

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
            Rewards APR
          </Typography>

          <TooltipButton
            value="Lenders may receive additional incentives distributed by external
          partners or protocol initiatives. These incentives are optional,
          variable, and not part of the core lending terms. Wildcat does not
          guarantee the program and accepts no liability."
          />
        </Box>

        {proposal}
      </Box>

      {banner}
    </Box>
  )
}
