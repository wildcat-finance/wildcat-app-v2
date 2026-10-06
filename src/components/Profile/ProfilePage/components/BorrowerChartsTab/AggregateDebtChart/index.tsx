"use client"

import * as React from "react"

import { BorrowerAggregateDebtPoint } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { BorrowerAggregateDebtData } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerAggregateDebt"
import { ChartBody } from "@/app/[locale]/lender/profile/components/LenderProfileMarketsTab/MarketCard/charts/ChartStates"
import {
  CHART_AXIS_TEXT_COLOR,
  ChartRange,
  DEFAULT_CHART_RANGE,
  filterByRange,
  getInterFontFamily,
  LegendItem,
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
import { trimAddress } from "@/utils/formatters"

import { CostChartCard } from "../CostChartCard"

const TOP_MARKETS = 3

const MARKET_PALETTE = [
  { fill: "#D5DCF6", stroke: "#6687FF" },
  { fill: "#FFEBB1", stroke: "#F9CF53" },
  { fill: "#CFF0E1", stroke: "#28CA7C" },
]
const OTHER_COLOR = { fill: "#E6E7EB", stroke: COLORS.greySuit }

type DebtSeries = {
  name: string
  fill: string
  stroke: string
  marketIds: string[]
}

const AXIS_LABEL_STYLE = { color: CHART_AXIS_TEXT_COLOR, fontSize: 11 } as const

const sumFor = (point: BorrowerAggregateDebtPoint, marketIds: string[]) =>
  marketIds.reduce((sum, id) => sum + Number(point[id] ?? 0), 0)

// Top markets by latest debt get their own colored band; the rest collapse into
// a single grey "Other (N markets)" band, matching the design.
const buildSeries = (
  points: BorrowerAggregateDebtPoint[],
  marketIds: string[],
  nameMap: Record<string, string>,
): DebtSeries[] => {
  const latest = points[points.length - 1]
  const ranked = [...marketIds].sort(
    (left, right) => Number(latest?.[right] ?? 0) - Number(latest?.[left] ?? 0),
  )
  const topIds = ranked.slice(0, TOP_MARKETS)
  const otherIds = ranked.slice(TOP_MARKETS)

  const series: DebtSeries[] = topIds.map((id, index) => ({
    name: nameMap[id] ?? trimAddress(id),
    ...MARKET_PALETTE[index % MARKET_PALETTE.length],
    marketIds: [id],
  }))

  if (otherIds.length > 0) {
    series.push({
      name: `Other (${otherIds.length} market${
        otherIds.length === 1 ? "" : "s"
      })`,
      ...OTHER_COLOR,
      marketIds: otherIds,
    })
  }

  return series
}

const buildOption = (
  points: BorrowerAggregateDebtPoint[],
  series: DebtSeries[],
): EChartOption => {
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
        const point = points.find((item) => item.timestamp * 1000 === timestamp)
        if (!point) return ""

        return interTooltipShell(
          formatChartDate(timestamp),
          [
            interTooltipRow({
              color: COLORS.santasGrey,
              label: "Total debt",
              value: formatUsd(point.totalDebtUsd, { compact: true }),
            }),
            ...series.map((item) =>
              interTooltipRow({
                color: item.stroke,
                label: item.name,
                value: formatUsd(sumFor(point, item.marketIds), {
                  compact: true,
                }),
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
    series: series.map((item) => ({
      name: item.name,
      type: "line",
      stack: "debt",
      yAxisIndex: 0,
      symbol: "none",
      smooth: false,
      lineStyle: { color: item.stroke, width: 1.5 },
      itemStyle: { color: item.stroke },
      areaStyle: { color: item.fill, opacity: 1 },
      emphasis: { focus: "series" },
      data: points.map((point) => [
        point.timestamp * 1000,
        sumFor(point, item.marketIds),
      ]),
    })),
  }
}

export const AggregateDebtChart = ({
  data,
  nameMap,
  isLoading,
}: {
  data?: BorrowerAggregateDebtData
  nameMap: Record<string, string>
  isLoading: boolean
}) => {
  const [range, setRange] = React.useState<ChartRange>(DEFAULT_CHART_RANGE)

  const points = React.useMemo(
    () => filterByRange(data?.points ?? [], range),
    [data?.points, range],
  )
  const series = React.useMemo(
    () => buildSeries(points, data?.marketIds ?? [], nameMap),
    [points, data?.marketIds, nameMap],
  )
  const option = React.useMemo(
    () => buildOption(points, series),
    [points, series],
  )

  const legend: LegendItem[] = series.map((item) => ({
    label: item.name,
    color: item.stroke,
    fillColor: item.fill,
    variant: "outline",
  }))

  return (
    <CostChartCard
      title="Aggregate debt"
      subtitle="In $ terms — total debt in USD over time, stacked by market"
      range={range}
      onRangeChange={setRange}
      legend={legend}
    >
      <ChartBody
        isLoading={isLoading}
        isEmpty={points.length === 0}
        emptyMessage="No debt history for this borrower yet."
        option={option}
        ariaLabel="Aggregate debt over time"
      />
    </CostChartCard>
  )
}
