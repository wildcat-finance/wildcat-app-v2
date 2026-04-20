"use client"

import { Box } from "@mui/material"

import { ExploreMarketsTable } from "@/app/[locale]/lender/components/ExploreMarketsTable"
import { TopMarketsSection } from "@/app/[locale]/lender/components/TopMarketsSection"
import { TrendingMarketsCarousel } from "@/app/[locale]/lender/components/TrendingMarketsCarousel"

export const ExploreSection = () => (
  <Box
    sx={{
      height: { xs: "auto", md: `calc(100vh - 82px)` },
      width: "100%",
      overflow: "auto",
    }}
  >
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "32px",
      }}
    >
      <TopMarketsSection />
      <TrendingMarketsCarousel />
      <ExploreMarketsTable />
    </Box>
  </Box>
)
