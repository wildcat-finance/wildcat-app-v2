"use client"

import * as React from "react"

import { Box, Typography } from "@mui/material"

import {
  ChartRange,
  LegendItem,
} from "@/app/[locale]/lender/profile/components/LenderProfileMarketsTab/MarketCard/charts/constants"
import {
  ChartLegend,
  ChartRangeSelector,
} from "@/app/[locale]/lender/profile/components/LenderProfileMarketsTab/MarketCard/charts/MarketChartShell"
import { useMobileResolution } from "@/hooks/useMobileResolution"

export const COST_CHART_HEIGHT = 300

// Section for the "Cost & debt trends" charts: a title/subtitle + range selector
// on the page background, above a light-grey panel with a top legend and chart.
export const CostChartCard = ({
  title,
  subtitle,
  range,
  onRangeChange,
  legend,
  children,
}: {
  title: string
  subtitle: string
  range: ChartRange
  onRangeChange: (range: ChartRange) => void
  legend: LegendItem[]
  children: React.ReactNode
}) => {
  const isMobile = useMobileResolution()

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant={isMobile ? "mobH3" : "title3"} display="block">
            {title}
          </Typography>
          <Typography
            variant={isMobile ? "mobText2" : "text2"}
            sx={{ opacity: 0.7 }}
          >
            {subtitle}
          </Typography>
        </Box>

        <ChartRangeSelector value={range} onChange={onRangeChange} />
      </Box>

      <Box
        sx={{
          backgroundColor: "#F9F9FA",
          borderRadius: "16px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ marginBottom: "12px" }}>
          <ChartLegend items={legend} />
        </Box>

        <Box sx={{ height: COST_CHART_HEIGHT }}>{children}</Box>
      </Box>
    </Box>
  )
}
