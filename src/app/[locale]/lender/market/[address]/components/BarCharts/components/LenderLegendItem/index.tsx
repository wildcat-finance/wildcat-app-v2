import { Box, Typography } from "@mui/material"

import { formatTokenWithCommas } from "@/utils/formatters"

import { LenderLegendItemProps } from "./interface"

export const LenderLegendItem = ({
  color,
  label,
  value,
  asset,
}: LenderLegendItemProps) => (
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
