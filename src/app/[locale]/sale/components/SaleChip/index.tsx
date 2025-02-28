import * as React from "react"

import { Box, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const SaleChip = ({
  value,
  color,
  textColor,
}: {
  value: string
  color: string
  textColor: string
}) => (
  <Box
    sx={{
      padding: "2px 8px",
      backgroundColor: color,
      borderRadius: "26px",

      display: "flex",
      alignItems: "center",
    }}
  >
    <Typography variant="text4" color={textColor}>
      {value}
    </Typography>
  </Box>
)
