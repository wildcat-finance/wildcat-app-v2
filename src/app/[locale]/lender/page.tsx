"use client"

import { Box } from "@mui/material"

import { ExploreSection } from "@/app/[locale]/lender/components/MarketsDashboard/ExploreSection"
import { Footer } from "@/components/Footer"

export default function Lender() {
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
        <ExploreSection />
      </Box>
      <Footer showFooter={false} />
    </Box>
  )
}
