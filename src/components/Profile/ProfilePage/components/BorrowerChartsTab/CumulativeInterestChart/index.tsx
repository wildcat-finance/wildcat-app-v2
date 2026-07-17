"use client"

import * as React from "react"

import { BorrowerCapitalCostPoint } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { ChartBody } from "@/app/[locale]/lender/profile/components/LenderProfileMarketsTab/MarketCard/charts/ChartStates"
import {
  CHART_AXIS_TEXT_COLOR,
  ChartRange,
  DEFAULT_CHART_RANGE,
  filterByRange,
  getInterFontFamily,
} from "@/app/[locale]/lender/profile/components/LenderProfileMarketsTab/MarketCard/charts/constants"
import {
  interTooltipRow,
  interTooltipShell,
} from "@/app/[locale]/lender/profile/components/LenderProfileMarketsTab/MarketCard/charts/tooltip"
import {
  EChartOption,
  formatAxisDate,
  formatChartDate,
} from "@/components/ECharts"
import {
  formatAxisNumber,
  formatUsd,
} from "@/components/Profile/shared/analytics"
import { COLORS } from "@/theme/colors"

import { CostChartCard } from "../CostChartCard"

type CumulativePoint = {
  timestamp: number
  baseInterest: number
  protocolFees: number
  delinquencyFees: number
}

type CostSeries = {
  key: keyof Omit<CumulativePoint, "timestamp">
  name: string
  fill: string
  stroke: string
}

const COST_SERIES: CostSeries[] = [
  {
    key: "baseInterest",
    name: "Base interest",
    fill: "#D5DCF6",
    stroke: "#6687FF",
  },
  {
    key: "protocolFees",
    name: "Protocol fees",
    fill: "#E6E7EB",
    stroke: COLORS.greySuit,
  },
  {
    key: "delinquencyFees",
    name: "Delinquency fees",
    fill: "#FFD0D3",
    stroke: COLORS.wildWatermelon,
  },
]

const AXIS_LABEL_STYLE = { color: CHART_AXIS_TEXT_COLOR, fontSize: 11 } as const

// Running totals of each fee stream over the full history.
const toCumulative = (
  points: BorrowerCapitalCostPoint[],
): CumulativePoint[] => {
  let base = 0
  let protocol = 0
  let delinquency = 0
  return points.map((point) => {
    base += point.baseInterest
    protocol += point.protocolFees
    delinquency += point.delinquencyFees
    return {
      timestamp: point.timestamp,
      baseInterest: base,
      protocolFees: protocol,
      delinquencyFees: delinquency,
    }
  })
}

const buildOption = (data: CumulativePoint[]): EChartOption => {
  const fontFamily = getInterFontFamily()

  return {
    animation: false,
    grid: { left: 4, right: 8, top: 8, bottom: 20, containLabel: true },
    tooltip: {
      trigger: "axis",
      confine: true,
      backgroundColor: COLORS.blackRock,
      borderColor: COLORS.iron,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: COLORS.white, fontFamily, fontSize: 11 },
      formatter: (params: unknown) => {
        const items = Array.isArray(params) ? params : [params]
        const timestamp = Number(items[0]?.axisValue ?? 0)
        const point = data.find((item) => item.timestamp * 1000 === timestamp)
        if (!point) return ""

        const total =
          point.baseInterest + point.protocolFees + point.delinquencyFees

        return interTooltipShell(
          formatChartDate(timestamp),
          [
            interTooltipRow({
              color: COLORS.santasGrey,
              label: "Total cost",
              value: formatUsd(total, { compact: true }),
            }),
            ...COST_SERIES.map((series) =>
              interTooltipRow({
                color: series.stroke,
                label: series.name,
                value: formatUsd(point[series.key], { compact: true }),
              }),
            ),
          ].join(""),
        )
      },
    },
    xAxis: {
      type: "time",
      boundaryGap: ["0%", "0%"],
      axisLine: { lineStyle: { color: COLORS.black01 } },
      axisTick: { show: false },
      axisLabel: {
        ...AXIS_LABEL_STYLE,
        fontFamily,
        formatter: (value: number) => formatAxisDate(value),
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        ...AXIS_LABEL_STYLE,
        fontFamily,
        formatter: (value: number) => `$${formatAxisNumber(value)}`,
      },
      splitLine: {
        lineStyle: { color: COLORS.athensGrey, type: "dashed", opacity: 0.9 },
      },
    },
    series: COST_SERIES.map((series) => ({
      name: series.name,
      type: "line",
      stack: "cost",
      yAxisIndex: 0,
      symbol: "none",
      smooth: false,
      lineStyle: { color: series.stroke, width: 1.5 },
      itemStyle: { color: series.stroke },
      areaStyle: { color: series.fill, opacity: 1 },
      emphasis: { focus: "series" },
      data: data.map((point) => [point.timestamp * 1000, point[series.key]]),
    })),
  }
}

export const CumulativeInterestChart = ({
  points,
  isLoading,
}: {
  points: BorrowerCapitalCostPoint[]
  isLoading: boolean
}) => {
  const [range, setRange] = React.useState<ChartRange>(DEFAULT_CHART_RANGE)

  const cumulative = React.useMemo(() => toCumulative(points), [points])
  const data = React.useMemo(
    () => filterByRange(cumulative, range),
    [cumulative, range],
  )
  const option = React.useMemo(() => buildOption(data), [data])

  return (
    <CostChartCard
      title="Cumulative interest cost"
      subtitle="In $ terms — running total of base interest, delinquency fees and protocol fees"
      range={range}
      onRangeChange={setRange}
      legend={COST_SERIES.map((series) => ({
        label: series.name,
        color: series.stroke,
        fillColor: series.fill,
        variant: "outline",
      }))}
    >
      <ChartBody
        isLoading={isLoading}
        isEmpty={data.length === 0}
        emptyMessage="No interest-cost history for this borrower yet."
        option={option}
        ariaLabel="Cumulative interest cost"
      />
    </CostChartCard>
  )
}
