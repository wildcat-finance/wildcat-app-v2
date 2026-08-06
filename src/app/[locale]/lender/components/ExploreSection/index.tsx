"use client"

import React, { useEffect, useState } from "react"

import { Box, Skeleton } from "@mui/material"

import { ExploreMarketsTable } from "@/app/[locale]/lender/components/ExploreSection/ExploreMarketsTable"
import { TrendingMarketsCarousel } from "@/app/[locale]/lender/components/ExploreSection/TrendingMarketsCarousel"
import { useIsSelectedNetworkRehydrated } from "@/hooks/useSelectedNetwork"
import { COLORS } from "@/theme/colors"

export const ExploreSection = () => {
  const [mounted, setMounted] = useState(false)
  const isSelectedNetworkRehydrated = useIsSelectedNetworkRehydrated()
  useEffect(() => setMounted(true), [])

  if (!mounted || !isSelectedNetworkRehydrated)
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {/* Carousel and Top Markets header render as one continuous card, so
            they share a single skeleton with no divider between them */}
        <Skeleton
          sx={{
            width: "100%",
            height: "524px",
            borderRadius: "14px",
            backgroundColor: { xs: COLORS.white06, md: "transparent" },
          }}
        />
        <Skeleton
          sx={{
            width: "100%",
            height: "182px",
            borderRadius: "14px",
            backgroundColor: { xs: COLORS.white06, md: "transparent" },
          }}
        />
        <Skeleton
          sx={{
            width: "100%",
            height: "182px",
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
          gap: { xs: 0, md: "32px" },
        }}
      >
        <TrendingMarketsCarousel />
        <ExploreMarketsTable />
      </Box>
    </Box>
  )
}
