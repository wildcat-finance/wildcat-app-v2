"use client"

import { Box } from "@mui/material"

import { Footer } from "@/components/Footer"

import { MyMarketsSection } from "./components/MyMarketsSection"

export default function MyMarketsPage() {
  return (
    <Box
      sx={{
        height: "100%",
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
          overflow: "auto",
          minHeight: 0,
        }}
      >
        <MyMarketsSection />
      </Box>
      <Footer showFooter={false} />
    </Box>
  )
}
