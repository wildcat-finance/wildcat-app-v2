"use client"

import { Box } from "@mui/material"

import { AllMarketsSection } from "./components/AllMarketsSection"

export default function AllMarkets() {
  return (
    <Box
      sx={{
        minHeight: { xs: "calc(100dvh - 64px)", md: "auto" },
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <AllMarketsSection />
      </Box>
    </Box>
  )
}
