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
  formatPercent,
} from "@/components/Profile/shared/analytics"
import { COLORS } from "@/theme/colors"

import { CostChartCard } from "../CostChartCard"

type AprPoint = {
  timestamp: number
  baseInterest: number
  protocolFees: number
  delinquencyFees: number
  statedApr: number
  effectiveApr: number
}

type AprSeries = {
  key: keyof Omit<AprPoint, "timestamp">
  name: string
  color: string
  dashed?: boolean
}

const APR_SERIES: AprSeries[] = [
  { key: "baseInterest", name: "Base interest", color: COLORS.blueRibbon },
  { key: "protocolFees", name: "Protocol fees", color: COLORS.greySuit },
  {
    key: "delinquencyFees",
    name: "Delinquency fees",
    color: COLORS.carminePink,
  },
  {
    key: "statedApr",
    name: "Stated APR",
    color: COLORS.lemonPie,
    dashed: true,
  },
  {
    key: "effectiveApr",
    name: "Effective APR",
    color: COLORS.blackRock,
    dashed: true,
  },
]

const AXIS_LABEL_STYLE = { color: CHART_AXIS_TEXT_COLOR, fontSize: 11 } as const

// Convert daily fee (USD) accrued into an annualized % of debt so the fee
// streams sit on the same percentage axis as stated/effective APR.
const toApr = (fee: number, debt: number) =>
  debt > 0 ? (fee / debt) * 365 * 100 : 0

const toAprPoints = (points: BorrowerCapitalCostPoint[]): AprPoint[] =>
  points.map((point) => ({
    timestamp: point.timestamp,
    baseInterest: toApr(point.baseInterest, point.totalDebtUsd),
    protocolFees: toApr(point.protocolFees, point.totalDebtUsd),
    delinquencyFees: toApr(point.delinquencyFees, point.totalDebtUsd),
    statedApr: point.statedApr,
    effectiveApr: point.effectiveApr,
  }))

const buildOption = (data: AprPoint[]): EChartOption => {
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

        return interTooltipShell(
          formatChartDate(timestamp),
          APR_SERIES.map((series) =>
            interTooltipRow({
              color: series.color,
              label: series.name,
              value: formatPercent(point[series.key], 2),
            }),
          ).join(""),
        )
      },
    },
    xAxis: {
      type: "time",
      boundaryGap: ["1%", "1%"],
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
        formatter: (value: number) => `${formatAxisNumber(value)}%`,
      },
      splitLine: {
        lineStyle: { color: COLORS.athensGrey, type: "dashed", opacity: 0.9 },
      },
    },
    series: APR_SERIES.map((series) => ({
      name: series.name,
      type: "line",
      symbol: "none",
      smooth: false,
      lineStyle: {
        color: series.color,
        width: 1.6,
        type: series.dashed ? "dashed" : "solid",
      },
      itemStyle: { color: series.color },
      data: data.map((point) => [point.timestamp * 1000, point[series.key]]),
    })),
  }
}

export const AprDriftChart = ({
  points,
  isLoading,
}: {
  points: BorrowerCapitalCostPoint[]
  isLoading: boolean
}) => {
  const [range, setRange] = React.useState<ChartRange>(DEFAULT_CHART_RANGE)

  const data = React.useMemo(
    () => filterByRange(toAprPoints(points), range),
    [points, range],
  )
  const option = React.useMemo(() => buildOption(data), [data])

  return (
    <CostChartCard
      title="Cost of capital and APR drift"
      subtitle="Interest, fees and effective APR over time, as a percentage"
      range={range}
      onRangeChange={setRange}
      legend={APR_SERIES.map((series) => ({
        label: series.name,
        color: series.color,
        variant: series.dashed ? "dashed" : "line",
      }))}
    >
      <ChartBody
        isLoading={isLoading}
        isEmpty={data.length === 0}
        emptyMessage="No capital-cost history for this borrower yet."
        option={option}
        ariaLabel="Cost of capital and APR drift"
      />
    </CostChartCard>
  )
}
