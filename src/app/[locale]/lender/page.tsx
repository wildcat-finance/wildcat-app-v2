"use client"

import { Box } from "@mui/material"

import { ExploreSection } from "@/app/[locale]/lender/components/MarketsDashboard/ExploreSection"
import { Footer } from "@/components/Footer"

export default function Lender() {
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
        <ExploreSection />
      </Box>
      <Footer showFooter={false} />
    </Box>
  )
}
