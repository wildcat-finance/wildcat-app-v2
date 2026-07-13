"use client"

import * as React from "react"

import { LenderRiskReturnsPoint } from "@/app/[locale]/lender/profile/hooks/types"
import { useLenderRiskReturnsChart } from "@/app/[locale]/lender/profile/hooks/useLenderRiskReturnsChart"
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
  YIELD_COLORS,
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

const buildOption = (data: LenderRiskReturnsPoint[]): EChartOption => {
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
      axisPointer: {
        type: "cross",
        lineStyle: { color: YIELD_COLORS.interest, width: 1, opacity: 0.7 },
        crossStyle: { color: YIELD_COLORS.interest, opacity: 0.7 },
      },
      formatter: (params: unknown) => {
        const items = Array.isArray(params) ? params : [params]
        const timestamp = Number(items[0]?.axisValue ?? 0)
        const point = data.find((item) => item.timestamp * 1000 === timestamp)
        if (!point) return ""

        return interTooltipShell(
          formatChartDate(timestamp),
          [
            interTooltipRow({
              color: YIELD_COLORS.interest,
              label: "Interest earned",
              value: formatUsd(point.cumulativeInterestUsd, { compact: true }),
            }),
            interTooltipRow({
              color: YIELD_COLORS.deposits,
              label: "Lenders deposits",
              value: formatUsd(point.depositsUsd, { compact: true }),
            }),
            interTooltipRow({
              color: YIELD_COLORS.otherWithdrawals,
              label: "Other-lender withdrawals",
              value: formatUsd(point.otherWithdrawalsUsd, { compact: true }),
            }),
            interTooltipRow({
              color: YIELD_COLORS.lenderWithdrawals,
              label: "Lender withdrawals",
              value: formatUsd(point.lenderWithdrawalsUsd, { compact: true }),
            }),
          ].join(""),
        )
      },
    },
    xAxis: {
      type: "time",
      boundaryGap: ["2%", "2%"],
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
        type: "value",
        position: "right",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          ...AXIS_LABEL_STYLE,
          fontFamily,
          formatter: (value: number) => `$${formatAxisNumber(value)}`,
        },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "Interest earned",
        type: "line",
        yAxisIndex: 0,
        symbol: "none",
        smooth: true,
        lineStyle: { color: YIELD_COLORS.interest, width: 1.6 },
        itemStyle: { color: YIELD_COLORS.interest },
        data: data.map((point) => [
          point.timestamp * 1000,
          point.cumulativeInterestUsd,
        ]),
      },
      {
        name: "Lenders Deposits",
        type: "bar",
        yAxisIndex: 1,
        barWidth: 6,
        itemStyle: { color: YIELD_COLORS.deposits, borderRadius: [3, 3, 0, 0] },
        data: data.map((point) => [point.timestamp * 1000, point.depositsUsd]),
      },
      {
        name: "Other-lender withdrawals",
        type: "bar",
        yAxisIndex: 1,
        stack: "withdrawals",
        barWidth: 6,
        itemStyle: { color: YIELD_COLORS.otherWithdrawals },
        data: data.map((point) => [
          point.timestamp * 1000,
          point.otherWithdrawalsUsd,
        ]),
      },
      {
        name: "Lender withdrawals",
        type: "bar",
        yAxisIndex: 1,
        stack: "withdrawals",
        barWidth: 6,
        itemStyle: { color: YIELD_COLORS.lenderWithdrawals },
        data: data.map((point) => [
          point.timestamp * 1000,
          point.lenderWithdrawalsUsd,
        ]),
      },
    ],
  }
}

export const YieldPressureChart = ({
  lenderAddress,
  marketId,
  priceMap,
}: {
  lenderAddress: `0x${string}` | undefined
  marketId: string
  priceMap: Record<string, number>
}) => {
  const [range, setRange] = React.useState<ChartRange>(DEFAULT_CHART_RANGE)

  const { data, isLoading } = useLenderRiskReturnsChart({
    lenderAddress,
    marketId,
    priceMap,
  })

  const points = React.useMemo(
    () => filterByRange(data?.points ?? [], range),
    [data?.points, range],
  )
  const option = React.useMemo(() => buildOption(points), [points])

  return (
    <MarketChartShell
      title="Yield vs withdrawal pressure"
      subtitle="Interest earned alongside deposit and withdrawal activity"
      range={range}
      onRangeChange={setRange}
      leftAxisLabel="Interest earned, USD"
      rightAxisLabel="Activity, USD"
      legend={[
        {
          label: "Interest earned",
          color: YIELD_COLORS.interest,
          variant: "line",
        },
        {
          label: "Lenders Deposits",
          color: YIELD_COLORS.deposits,
          variant: "square",
        },
        {
          label: "Other-lender withdrawals",
          color: YIELD_COLORS.otherWithdrawals,
          variant: "square",
        },
        {
          label: "Lender withdrawals",
          color: YIELD_COLORS.lenderWithdrawals,
          variant: "square",
        },
      ]}
    >
      <ChartBody
        isLoading={isLoading}
        isEmpty={points.length === 0}
        emptyMessage="No deposit or withdrawal history for this market yet."
        option={option}
        ariaLabel="Yield vs withdrawal pressure"
      />
    </MarketChartShell>
  )
}
