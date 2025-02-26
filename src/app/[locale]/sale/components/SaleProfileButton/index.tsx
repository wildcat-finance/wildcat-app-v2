"use client"

import { Box, Typography } from "@mui/material"
import { useAccount } from "wagmi"

import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export const SaleProfile = () => {
  const { address, isConnected } = useAccount()

  return (
    <Box sx={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <Box
        sx={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          backgroundColor: COLORS.athensGrey,
        }}
      />

      <Typography variant="text3">
        {address ? trimAddress(address) : "Disconnected"}
      </Typography>
    </Box>
  )
}
