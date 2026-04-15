"use client"

import { Box } from "@mui/material"

import { Footer } from "@/components/Footer"

export default function MyMarkets() {
  return (
    <Box
      sx={{
        minHeight: { xs: "calc(100dvh - 64px)", md: "auto" },
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }} />
      <Footer showFooter={false} />
    </Box>
  )
}
