"use client"

import { Box } from "@mui/material"

import { MyMarketsSection } from "./components/MyMarketsSection"

export default function MyMarketsPage() {
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
        <MyMarketsSection />
      </Box>
    </Box>
  )
}
