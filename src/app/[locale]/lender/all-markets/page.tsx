"use client"

import { Box } from "@mui/material"

import { AllMarketsSection } from "./components/AllMarketsSection"

export default function AllMarkets() {
  return (
    <Box
      sx={{
        flex: "1 1 0",
        minHeight: 0,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          flex: "1 1 0",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <AllMarketsSection />
      </Box>
    </Box>
  )
}
