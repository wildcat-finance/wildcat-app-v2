import * as React from "react"

import { Box, SvgIcon, Typography } from "@mui/material"

import Ethena from "@/assets/companies-icons/ethena_icon.svg"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

export const AurosEthenaProposalChip = ({
  isTooltip,
}: {
  isTooltip: boolean
}) => {
  const isMobile = useMobileResolution()

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
        variant={isMobile ? "mobText3" : "text3"}
        fontWeight={isTooltip ? 600 : 500}
      >
        20x Multiplier
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
          <Ethena />
        </SvgIcon>

        <Typography variant={isMobile ? "mobText4" : "text4"}>
          Ethena Points
        </Typography>
      </Box>
    </Box>
  )
}
