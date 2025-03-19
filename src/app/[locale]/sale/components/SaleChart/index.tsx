"use client"

import * as React from "react"

import { LineChart } from "@mui/x-charts/LineChart"

import { COLORS } from "@/theme/colors"

import { CustomAnimatedLine } from "./CustomAnimatedLine"

const ChartStyles = {
  pointerEvents: "none",
  "& .line-after path": {
    strokeDasharray: "6 4",
    stroke: COLORS.blueRibbon,
    strokeWidth: 1,
  },
  "& .line-before path": {
    strokeWidth: 2,
  },
  "& .MuiChartsAxis-bottom .MuiChartsAxis-line": {
    stroke: COLORS.greySuit,
  },
  "& .MuiChartsAxis-bottom .MuiChartsAxis-tickLabel": {
    fill: COLORS.greySuit,
  },
  "& .MuiChartsGrid-lineHorizontal": {
    strokeDasharray: "4 4",
    stroke: COLORS.greySuit,
  },
}

const TickLabelStyle = {
  fontFamily: "inherit",
  fontWeight: 500,
  fontSize: "11px",
  lineHeight: "16px",
  fill: COLORS.greySuit,
}

export type SaleChartProps = {
  period: "hour" | "day" | "week"
  historicalData: number[]
  futureData: number[]
}

export default function SaleChart({
  period,
  historicalData,
  futureData,
}: SaleChartProps) {
  const lastRealIndex = historicalData.length - 1
  const totalPoints = historicalData.length + futureData.length

  const getXAxisData = () => {
    if (period === "hour") {
      return Array.from({ length: totalPoints }, (_, i) => i)
    }
    if (period === "day") {
      return Array.from({ length: 18 }, (_, i) => i)
    }
    if (period === "week") {
      return [0, 1, 2, 3, 4, 5, 6]
    }
    return []
  }

  const xAxisFormatter = (index: number) => {
    if (period === "hour") {
      return `${String(index * 5).padStart(2, "0")}:00`
    }
    if (period === "day") {
      const labels = {
        0: "00:00",
        5: "06:00",
        11: "12:00",
        17: "18:00",
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      return labels[index] || ""
    }
    if (period === "week") {
      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index] || ""
    }
    return ""
  }

  const xAxisData = getXAxisData()

  return (
    <LineChart
      series={[
        {
          type: "line",
          color: COLORS.blueRibbon,
          showMark: false,
          data: [...historicalData, ...futureData],
        },
      ]}
      xAxis={[
        {
          data: xAxisData,
          valueFormatter: xAxisFormatter,
          tickLabelStyle: TickLabelStyle,
        },
      ]}
      height={370}
      slots={{ line: CustomAnimatedLine }}
      slotProps={{ line: { limit: lastRealIndex } as never }}
      sx={ChartStyles}
      leftAxis={null}
      bottomAxis={{
        disableTicks: true,
      }}
      grid={{ vertical: false, horizontal: true }}
    />
  )
}
