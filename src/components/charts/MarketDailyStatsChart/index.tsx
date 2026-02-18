"use client"

import { useMemo } from "react"

import { Typography } from "@mui/material"
import { BarChart, BarSeries } from "@mui/x-charts/BarChart"
import { MarketDailyStats } from "@wildcatfi/wildcat-sdk"

import { useMobileResolution } from "@/hooks/useMobileResolution"

interface LendingMarketChartProps {
  data?: MarketDailyStats[]
  tokenSymbol: string
}

export default function MarketDailyStatsChart({
  data = [],
  tokenSymbol,
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
      return `${sign}${(value / 1_000_000).toFixed(2)}M ${tokenSymbol}`
    }
    if (value >= 1_000) {
      return `${sign}${(value / 1_000).toFixed(2)}K ${tokenSymbol}`
    }
    return `${sign}${value.toFixed(2)} ${tokenSymbol}`
  }

  const { filledDailyData, dailyChartSeries, yAxisDailyDomain } =
    useMemo(() => {
      console.log(`Calculating daily data for ${data.length} days`)
      const today = Math.floor(Date.now() / 1000)
      const startTimestamp = data[0]?.timestamp ?? today
      const days = Math.floor((today - startTimestamp) / 86_400)
      const filledData = Array.from({ length: days }, (_, i) => {
        const timestamp = startTimestamp + i * 86_400
        const dailyStats = data.find((point) => point.timestamp === timestamp)
        if (dailyStats) {
          return {
            ...dailyStats,
            timestamp: timestamp * 1000,
            totalWithdrawn: -1 * dailyStats.totalWithdrawn,
          }
        }
        return {
          timestamp: timestamp * 1000,
          totalDeposited: 0,
          totalWithdrawn: 0,
          totalBorrowed: 0,
          totalRepaid: 0,
        }
      })

      const chartSeries = [
        {
          data: filledData.map((point) => point.totalDeposited),
          label: "Total Deposited",
          color: "#009689",
          stack: "total",
          valueFormatter: formatValue,
        },
        {
          data: filledData.map((point) => point.totalWithdrawn),
          label: "Total Withdrawn",
          color: "#f54900",
          stack: "total",
          valueFormatter: formatValue,
        },
      ]
      const dailyValues = chartSeries.map((x) => x.data).flat()

      let min = Number.POSITIVE_INFINITY
      let max = Number.NEGATIVE_INFINITY

      dailyValues.forEach((value) => {
        if (value < min) min = value
        if (value > max) max = value
      })

      const range = max - min
      const padding = range * 0.1

      return {
        filledDailyData: filledData,
        dailyChartSeries: chartSeries,
        yAxisDailyDomain: [Math.min(0, min - padding), max + padding],
      }
    }, [data])

  return (
    data.length > 0 && (
      <div style={{ width: "100%" }}>
        <div className="flex flex-col">
          <Typography variant={isMobile ? "mobH3" : "title3"}>
            Daily Activity
          </Typography>
        </div>
        <div style={{ width: "100%", height: 400 }}>
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
                data: filledDailyData.map((point) =>
                  formatTimestamp(point.timestamp),
                ),
                scaleType: "band",
              },
            ]}
            yAxis={[
              {
                valueFormatter: (x: number) => formatValue(Math.abs(x)),
                min: yAxisDailyDomain[0],
                max: yAxisDailyDomain[1],
                width: 100,
              },
            ]}
            series={dailyChartSeries as BarSeries[]}
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
