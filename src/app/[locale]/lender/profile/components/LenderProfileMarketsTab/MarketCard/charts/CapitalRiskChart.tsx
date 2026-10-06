"use client"

import * as React from "react"

import { LenderCapitalAtRiskPoint } from "@/app/[locale]/lender/profile/hooks/types"
import { useLenderCapitalAtRiskTimeline } from "@/app/[locale]/lender/profile/hooks/useLenderCapitalAtRiskTimeline"
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

import { ChartBody } from "./ChartStates"
import {
  CHART_AXIS_TEXT_COLOR,
  ChartRange,
  DEFAULT_CHART_RANGE,
  RISK_COLORS,
  filterByRange,
  getInterFontFamily,
} from "./constants"
import { MarketChartShell } from "./MarketChartShell"
import { interTooltipRow, interTooltipShell } from "./tooltip"

const AXIS_LABEL_STYLE = {
  color: CHART_AXIS_TEXT_COLOR,
  fontSize: 11,
} as const

const SPLIT_LINE_STYLE = {
  lineStyle: { color: COLORS.athensGrey, type: "dashed", opacity: 0.9 },
} as const

const RISK_SERIES = [
  { key: "healthyUsd", name: "Healthy", ...RISK_COLORS.healthy },
  { key: "graceUsd", name: "In grace", ...RISK_COLORS.grace },
  { key: "penaltyUsd", name: "Penalty-accruing", ...RISK_COLORS.penalty },
  {
    key: "withdrawalQueueUsd",
    name: "Withdrawal queue",
    ...RISK_COLORS.withdrawalQueue,
  },
] as const

const buildOption = (data: LenderCapitalAtRiskPoint[]): EChartOption => {
  const fontFamily = getInterFontFamily()

  return {
    animation: false,
    grid: { left: 4, right: 4, top: 8, bottom: 20, containLabel: true },
    tooltip: {
      trigger: "axis",
      confine: true,
      backgroundColor: COLORS.blackRock,
      borderColor: COLORS.iron,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: COLORS.white, fontFamily, fontSize: 11 },
      axisPointer: {
        type: "cross",
        lineStyle: {
          color: RISK_COLORS.healthy.stroke,
          width: 1,
          opacity: 0.7,
        },
        crossStyle: { color: RISK_COLORS.healthy.stroke, opacity: 0.7 },
      },
      formatter: (params: unknown) => {
        const items = Array.isArray(params) ? params : [params]
        const timestamp = Number(items[0]?.axisValue ?? 0)
        const point = data.find((item) => item.timestamp * 1000 === timestamp)
        if (!point) return ""

        const totalExposure =
          point.healthyUsd +
          point.graceUsd +
          point.penaltyUsd +
          point.withdrawalQueueUsd

        return interTooltipShell(
          formatChartDate(timestamp),
          [
            interTooltipRow({
              color: COLORS.santasGrey,
              label: "Total exposure",
              value: formatUsd(totalExposure, { compact: true }),
            }),
            ...RISK_SERIES.map((series) =>
              interTooltipRow({
                color: series.stroke,
                label: series.name,
                value: formatUsd(Number(point[series.key]), { compact: true }),
              }),
            ),
            interTooltipRow({
              color: RISK_COLORS.penaltyFees,
              label: "Cumulative penalty fees",
              value: formatUsd(point.cumulativeDelinquencyFeesEarnedUsd, {
                compact: true,
              }),
            }),
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
    yAxis: [
      {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          ...AXIS_LABEL_STYLE,
          fontFamily,
          formatter: (value: number) => `$${formatAxisNumber(value)}`,
        },
        splitLine: SPLIT_LINE_STYLE,
      },
      {
        // Cumulative penalty fees ride on their own hidden scale so the line
        // stays visible even when exposure dwarfs the fees earned.
        type: "value",
        position: "right",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
      },
    ],
    series: [
      ...RISK_SERIES.map((series) => ({
        name: series.name,
        type: "line",
        stack: "risk",
        yAxisIndex: 0,
        symbol: "none",
        smooth: true,
        lineStyle: { color: series.stroke, width: 1.5 },
        itemStyle: { color: series.stroke },
        areaStyle: { color: series.fill, opacity: 1 },
        emphasis: { focus: "series" },
        data: data.map((point) => [
          point.timestamp * 1000,
          Number(point[series.key]),
        ]),
      })),
      {
        name: "Cumulative penalty fees",
        type: "line",
        yAxisIndex: 1,
        symbol: "none",
        smooth: false,
        lineStyle: {
          color: RISK_COLORS.penaltyFees,
          width: 1.4,
          type: "dashed",
          opacity: 0.85,
        },
        itemStyle: { color: RISK_COLORS.penaltyFees },
        data: data.map((point) => [
          point.timestamp * 1000,
          point.cumulativeDelinquencyFeesEarnedUsd,
        ]),
      },
    ],
  }
}

export const CapitalRiskChart = ({
  lenderAddress,
  marketId,
  priceMap,
}: {
  lenderAddress: `0x${string}` | undefined
  marketId: string
  priceMap: Record<string, number>
}) => {
  const [range, setRange] = React.useState<ChartRange>(DEFAULT_CHART_RANGE)

  const marketIds = React.useMemo(() => [marketId], [marketId])
  const { data, isLoading } = useLenderCapitalAtRiskTimeline({
    lenderAddress,
    marketIds,
    priceMap,
  })

  const points = React.useMemo(
    () => filterByRange(data ?? [], range),
    [data, range],
  )
  const option = React.useMemo(() => buildOption(points), [points])

  return (
    <MarketChartShell
      title="Capital-at-risk timeline"
      subtitle="Exposure by market state and cumulative penalty fees"
      range={range}
      onRangeChange={setRange}
      leftAxisLabel="Penalty fees, USD"
      legend={[
        {
          label: "Healthy",
          color: RISK_COLORS.healthy.stroke,
          fillColor: RISK_COLORS.healthy.fill,
          variant: "outline",
        },
        {
          label: "In grace",
          color: RISK_COLORS.grace.stroke,
          fillColor: RISK_COLORS.grace.fill,
          variant: "outline",
        },
        {
          label: "Penalty-accruing",
          color: RISK_COLORS.penalty.stroke,
          fillColor: RISK_COLORS.penalty.fill,
          variant: "outline",
        },
        {
          label: "Withdrawal queue",
          color: RISK_COLORS.withdrawalQueue.stroke,
          fillColor: RISK_COLORS.withdrawalQueue.fill,
          variant: "outline",
        },
        {
          label: "Cumulative penalty fees",
          color: RISK_COLORS.penaltyFees,
          variant: "dashed",
        },
      ]}
    >
      <ChartBody
        isLoading={isLoading}
        isEmpty={points.length === 0}
        emptyMessage="No capital-at-risk history for this market yet."
        option={option}
        ariaLabel="Capital-at-risk timeline"
      />
    </MarketChartShell>
  )
}
