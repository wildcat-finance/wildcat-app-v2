"use client"

import { Box } from "@mui/material"

import { TopMarketsSection } from "@/app/[locale]/lender/components/TopMarketsSection"
import { TrendingMarketsCarousel } from "@/app/[locale]/lender/components/TrendingMarketsCarousel"

export const ExploreSection = () => (
  <Box
    sx={{
      width: "100%",
      padding: "28px 16px",
      display: "flex",
      flexDirection: "column",
      gap: "32px",
    }}
  >
    <TopMarketsSection />
    <TrendingMarketsCarousel />
  </Box>
)
