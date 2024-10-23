import * as React from "react"

import { Box } from "@mui/material"

import { LenderMarketSections } from "@/store/slices/lenderMarketRoutingSlice/lenderMarketRoutingSlice"

import { CapacityBarChart } from "./CapacityBarChart"
import { DebtBarChart } from "./DebtBarChart"
import { BarChartProps } from "./interface"

export const BarCharts = ({ marketAccount }: BarChartProps) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: "28px" }}>
    <CapacityBarChart
      marketAccount={marketAccount}
      section={LenderMarketSections.STATUS}
    />
    <DebtBarChart marketAccount={marketAccount} />
  </Box>
)
