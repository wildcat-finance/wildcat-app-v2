"use client"

import { Box, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const AnalyticsUnavailableNotice = ({
  title = "Analytics unavailable on this network",
  description = "Switch the network selector to a supported chain (Ethereum mainnet or Sepolia) to view historical analytics for this profile.",
}: {
  title?: string
  description?: string
}) => (
  <Box
    sx={{
      border: `1px dashed ${COLORS.iron}`,
      borderRadius: "16px",
      padding: "24px",
      textAlign: "center",
      backgroundColor: COLORS.blackHaze,
    }}
  >
    <Typography variant="text2" sx={{ color: COLORS.blackRock }}>
      {title}
    </Typography>
    <Typography
      variant="text4"
      color={COLORS.santasGrey}
      sx={{ display: "block", marginTop: "6px" }}
    >
      {description}
    </Typography>
  </Box>
)
