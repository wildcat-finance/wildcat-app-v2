"use client"

import { Box } from "@mui/material"

import { ExploreSection } from "@/app/[locale]/lender/components/MarketsDashboard/ExploreSection"
import { Footer } from "@/components/Footer"

export default function Lender() {
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
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <ExploreSection />
      </Box>
      <Footer showFooter={false} />
    </Box>
  )
}
