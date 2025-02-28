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
      {/* Clip to show the line before the limit */}
      <clipPath id={clipIdLeft}>
        <rect
          x={left}
          y={0}
          width={limitPosition - left}
          height={top + height + bottom}
        />
      </clipPath>
      {/* Clip to show the line after the limit */}
      <clipPath id={clipIdRight}>
        <rect
          x={limitPosition}
          y={0}
          width={left + width - limitPosition}
          height={top + height + bottom}
        />
      </clipPath>
      <g clipPath={`url(#${clipIdLeft})`} className="line-before">
        <AnimatedLine {...other} strokeWidth={2} />{" "}
        {/* Установлена толщина основной линии 2px */}
      </g>
      <g clipPath={`url(#${clipIdRight})`} className="line-after">
        <AnimatedLine {...other} strokeWidth={1} />{" "}
        {/* Установлена толщина пунктирной линии 1px */}
      </g>
    </>
  )
}

export default function LineWithPrediction() {
  const historicalData = [100, 80, 65, 50, 40, 35] // Исторические данные
  const futureData = [30, 25, 22, 20] // Прогноз

  return (
    <LineChart
      series={[
        {
          type: "line",
          color: COLORS.blueRibbon,
          showMark: false,
          data: [...historicalData, ...futureData],
          valueFormatter: (v, i) =>
            `${v}${i.dataIndex >= historicalData.length ? " (estimated)" : ""}`,
        },
      ]}
      xAxis={[
        {
          data: Array.from(
            { length: historicalData.length + futureData.length },
            (_, i) => i * 2,
          ),
          valueFormatter: (time) => {
            if (time === 6) return "Now"
            if (time === 0) return "12am"
            if (time === 12) return "12pm"
            if (time === 18) return "6pm"
            return ""
          },
          tickLabelStyle: {
            fontFamily: "inherit", // Шрифт Inter
            fontWeight: 500, // Жирность 500
            fontSize: "11px", // Размер 11px
            lineHeight: "16px", // Высота строки 16px
            fill: COLORS.greySuit, // Цвет текста
          },
        },
      ]}
      height={370}
      slots={{ line: CustomAnimatedLine }}
      slotProps={{ line: { limit: historicalData.length - 1 } as any }}
      sx={{
        pointerEvents: "none",

        "& .line-after path": {
          strokeDasharray: "6 4", // Сделана пунктирная линия
          stroke: COLORS.blueRibbon,
          strokeWidth: 1, // Установлена толщина пунктирной линии 1px
        },
        "& .line-before path": {
          strokeWidth: 2, // Установлена толщина основной линии 2px
        },
        "& .MuiChartsAxis-bottom .MuiChartsAxis-line": {
          stroke: COLORS.greySuit, // Изменен цвет нижней границы
        },
        "& .MuiChartsAxis-bottom .MuiChartsAxis-tickLabel": {
          fill: COLORS.greySuit, // Изменен цвет подписей на оси X
        },
        "& .MuiChartsGrid-lineHorizontal": {
          strokeDasharray: "4 4", // Вертикальные линии пунктирные
          stroke: COLORS.greySuit, // Цвет линий
        },
      }}
      leftAxis={null}
      bottomAxis={{
        disableTicks: true,
      }}
      grid={{ vertical: false, horizontal: true }} // Добавлены горизонтальные пунктирные линии
    />
  )
}
