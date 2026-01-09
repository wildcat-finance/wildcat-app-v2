import { Box, Typography } from "@mui/material"
import cn from "classnames"

import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { LenderLegendItemProps } from "./interface"

export const LenderLegendItem = ({
  color,
  label,
  value,
  asset,
  legendDotClassName,
  onClick,
  withDivider = false,
}: LenderLegendItemProps & {
  legendDotClassName?: string
  onClick?: () => void
  withDivider?: boolean
}) => {
  const isMobile = useMobileResolution()

  if (isMobile) {
    return (
      <Box
        sx={{
          width: "100%",
          backgroundColor: COLORS.white,
          borderRadius: "14px",
        }}
      >
        <Box
          className="barchart__legend-header"
          sx={{
            borderBottom: withDivider
              ? `1px solid ${COLORS.athensGrey}`
              : "none",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0px",
            padding: "10px 0",
            gap: "8px",
            cursor: onClick ? "pointer" : "default",
            width: "100%",
          }}
          onClick={onClick}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Typography variant="mobText3">{label}</Typography>
            <Box
              className={cn("barchart__legend-dot", legendDotClassName)}
              sx={{
                backgroundColor: color,
                width: 12,
                height: 12,
                borderRadius: "50%",
              }}
            />
          </Box>
          <Typography variant="mobText3">
            {formatTokenWithCommas(value)} {asset}
          </Typography>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <Box
        sx={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
      <Typography variant="text4">
        {label} {formatTokenWithCommas(value)} {asset}
      </Typography>
    </Box>
  )
}
