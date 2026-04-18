"use client"

import { Box } from "@mui/material"

import { ExploreMarketsTable } from "@/app/[locale]/lender/components/ExploreMarketsTable"
import { TopMarketsSection } from "@/app/[locale]/lender/components/TopMarketsSection"
import { TrendingMarketsCarousel } from "@/app/[locale]/lender/components/TrendingMarketsCarousel"

export const ExploreSection = () => (
  <Box
    sx={{
      width: "100%",
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      paddingY: "28px",
      display: "flex",
      flexDirection: "column",
      gap: "32px",
    }}
  >
    <TopMarketsSection />
    <TrendingMarketsCarousel />
    <ExploreMarketsTable />
  </Box>
)
