"use client"

import { Box } from "@mui/material"

import { MyMarketsSection } from "./components/MyMarketsSection"

export default function MyMarketsPage() {
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
        <MyMarketsSection />
      </Box>
    </Box>
  )
}
