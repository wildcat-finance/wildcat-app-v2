"use client"

import { useMemo } from "react"

import { Typography } from "@mui/material"
import { BarChart } from "@mui/x-charts/BarChart"
import { MarketWithdrawalBatchExpirationStats } from "@wildcatfi/wildcat-sdk"

import { useMobileResolution } from "@/hooks/useMobileResolution"

interface LendingMarketChartProps {
  data?: MarketWithdrawalBatchExpirationStats[]
}

export default function MarketWithdrawalsChart({
  data = [],
}: LendingMarketChartProps) {
  const isMobile = useMobileResolution()

  const formatTimestamp = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })

  const formatValue = (value: number) => {
    const sign = value >= 0 ? "" : "-"
    value = Math.abs(value)
    if (value >= 1_000_000) {
      return `${sign}$${(value / 1_000_000).toFixed(2)}M`
    }
    if (value >= 1_000) {
      return `${sign}$${(value / 1_000).toFixed(2)}K`
    }
    return `${sign}$${value.toFixed(2)}`
  }

  const batchChartData = useMemo(() => {
    console.log(`Calculating batch data for ${data.length} batches`)
    return data.map((batch) => ({
      timestamp: batch.timestamp * 1000,
      amountPaid: batch.normalizedAmountPaid,
      amountUnpaid: batch.normalizedAmountOwed,
      isFullyPaid: batch.normalizedAmountOwed === 0,
    }))
  }, [data])

  const batchChartSeries = useMemo(() => {
    console.log(`Calculating batch data for ${batchChartData.length} batches`)
    return [
      {
        data: batchChartData.map((batch) => batch.amountPaid),
        label: "Amount Paid",
        color: "#22c55e",
        stack: "batch",
      },
      {
        data: batchChartData.map((batch) => batch.amountUnpaid),
        label: "Amount Unpaid",
        color: "#ef4444",
        stack: "batch",
      },
    ]
  }, [batchChartData])

  return (
    data.length > 0 && (
      <div style={{ width: "100%" }}>
        <div className="flex flex-col">
          <Typography variant={isMobile ? "mobH3" : "title3"}>
            Batch Payment Status
          </Typography>
        </div>
        <div style={{ height: 400, width: "100%" }}>
          <BarChart
            slotProps={{
              legend: {
                className: "text3",
                sx: {
                  fontSize: "1rem",
                },
              },
            }}
            xAxis={[
              {
                data: batchChartData.map((point) =>
                  formatTimestamp(point.timestamp),
                ),
                scaleType: "band",
              },
            ]}
            yAxis={[
              {
                valueFormatter: formatValue,
              },
            ]}
            series={batchChartSeries}
            height={400}
            margin={{ top: 20, right: 20, bottom: 40, left: 80 }}
            sx={{
              "& .MuiChartsAxis-line": {
                stroke: "hsl(var(oklch(0.922 0 0))",
              },
              "& .MuiChartsAxis-tick": {
                stroke: "hsl(var(oklch(0.922 0 0))",
              },
              "& .MuiChartsAxis-tickLabel": {
                fill: "hsl(var(oklch(0.556 0 0)))",
              },
              "& .MuiChartsGrid-line": {
                stroke: "hsl(var(oklch(0.922 0 0)))",
                strokeDasharray: "3 3",
              },
              "& .MuiChartsLegend-series text": {
                fill: "hsl(var(oklch(0.145 0 0))) !important",
              },
            }}
          />
        </div>
      </div>
    )
  )
}
