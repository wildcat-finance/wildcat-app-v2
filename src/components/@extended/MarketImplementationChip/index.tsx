import { Chip, Typography } from "@mui/material"

import {
  getMarketImplementationConfig,
  MarketImplementationType,
} from "@/utils/marketImplementation"

import { MarketImplementationChipProps } from "./interface"

const renderTableLabel = (
  implementationType: MarketImplementationType,
  isMobile?: boolean,
) => {
  const chipConfig = getMarketImplementationConfig(implementationType)

  return (
    <Typography
      variant={isMobile ? "mobText4" : "text3"}
      sx={{ color: chipConfig.color }}
    >
      {chipConfig.label}
    </Typography>
  )
}

export const MarketImplementationChip = ({
  implementationType,
  type,
  isMobile,
}: MarketImplementationChipProps) => {
  const chipConfig = getMarketImplementationConfig(implementationType)

  if (type === "table") {
    return renderTableLabel(implementationType, isMobile)
  }

  return (
    <Chip
      label={chipConfig.label}
      sx={{
        backgroundColor: chipConfig.backgroundColor,
        color: chipConfig.color,
        "& .MuiChip-label": {
          paddingLeft: "12px",
          paddingRight: "12px",
        },
      }}
    />
  )
}
