"use client"

import React, { useEffect, useState } from "react"

import { Box, Skeleton } from "@mui/material"

import { ExploreMarketsTable } from "@/app/[locale]/lender/components/ExploreSection/ExploreMarketsTable"
import { TopMarketsSection } from "@/app/[locale]/lender/components/ExploreSection/TopMarketsSection"
import { TrendingMarketsCarousel } from "@/app/[locale]/lender/components/ExploreSection/TrendingMarketsCarousel"
import { COLORS } from "@/theme/colors"

export const ExploreSection = () => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted)
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <Skeleton
          sx={{
            width: "100%",
            height: "370px",
            borderRadius: "14px",
            backgroundColor: { xs: COLORS.white06, md: "transparent" },
          }}
        />
        <Skeleton
          sx={{
            width: "100%",
            height: "240px",
            borderRadius: "14px",
            backgroundColor: { xs: COLORS.white06, md: "transparent" },
          }}
        />
        <Skeleton
          sx={{
            width: "100%",
            height: "570px",
            borderRadius: "14px",
            backgroundColor: { xs: COLORS.white06, md: "transparent" },
          }}
        />
      </Box>
    )

  return (
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
          gap: { xs: "4px", md: "32px" },
        }}
      >
        <TopMarketsSection />
        <TrendingMarketsCarousel />
        <ExploreMarketsTable />
      </Box>
    </Box>
  )
}
