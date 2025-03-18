"use client"

import * as React from "react"

import { useChartId, useDrawingArea, useXScale } from "@mui/x-charts/hooks"
import {
  LineChart,
  AnimatedLine,
  AnimatedLineProps,
} from "@mui/x-charts/LineChart"

import { COLORS } from "@/theme/colors"

interface CustomAnimatedLineProps extends AnimatedLineProps {
  limit?: number
}

function CustomAnimatedLine(props: CustomAnimatedLineProps) {
  const { limit, ...other } = props
  const { top, bottom, height, left, width } = useDrawingArea()
  const scale = useXScale()
  const chartId = useChartId()

  if (limit === undefined) {
    return <AnimatedLine {...other} />
  }

  const limitPosition = scale(limit) // Convert value to x coordinate.

  if (limitPosition === undefined) {
    return <AnimatedLine {...other} />
  }

  const clipIdLeft = `${chartId}-${props.ownerState.id}-line-limit-${limit}-1`
  const clipIdRight = `${chartId}-${props.ownerState.id}-line-limit-${limit}-2`

  return (
    <>
      <clipPath id={clipIdLeft}>
        <rect
          x={left}
          y={0}
          width={limitPosition - left}
          height={top + height + bottom}
        />
      </clipPath>
      <clipPath id={clipIdRight}>
        <rect
          x={limitPosition}
          y={0}
          width={left + width - limitPosition}
          height={top + height + bottom}
        />
      </clipPath>
      <g clipPath={`url(#${clipIdLeft})`} className="line-before">
        <AnimatedLine {...other} strokeWidth={2} />
      </g>
      <g clipPath={`url(#${clipIdRight})`} className="line-after">
        <AnimatedLine {...other} strokeWidth={1} />
      </g>
    </>
  )
}

export default function LineWithPrediction() {
  const historicalData = [100, 80, 65, 50, 40, 35]
  const futureData = [30, 25, 22, 20]
  const lastRealIndex = historicalData.length - 1

  return (
    <LineChart
      series={[
        {
          type: "line",
          color: COLORS.blueRibbon,
          showMark: false,
          data: [...historicalData, ...futureData],
          valueFormatter: (v, i) =>
            `${v}${i.dataIndex > lastRealIndex ? " (estimated)" : ""}`,
        },
      ]}
      xAxis={[
        {
          data: Array.from(
            { length: historicalData.length + futureData.length },
            (_, i) => i * 2,
          ),
          valueFormatter: (time) => {
            if (time === 6) return "6am"
            if (time === 0) return "12am"
            if (time === 12) return "12pm"
            if (time === 18) return "6pm"
            return ""
          },
          tickLabelStyle: {
            fontFamily: "inherit",
            fontWeight: 500,
            fontSize: "11px",
            lineHeight: "16px",
            fill: COLORS.greySuit,
          },
        },
      ]}
      height={370}
      slots={{ line: CustomAnimatedLine }}
      slotProps={{ line: { limit: lastRealIndex } as never }}
      sx={{
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
      }}
      leftAxis={null}
      bottomAxis={{
        disableTicks: true,
      }}
      grid={{ vertical: false, horizontal: true }}
    />
  )
}
