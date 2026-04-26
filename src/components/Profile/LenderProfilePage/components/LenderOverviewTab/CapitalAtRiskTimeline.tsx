"use client"

import * as React from "react"

import { Box, Skeleton } from "@mui/material"

import { LenderCapitalAtRiskPoint } from "@/app/[locale]/lender/profile/hooks/types"
import {
  CHART_PALETTE,
  EChart,
  EChartOption,
  formatAxisDate,
  formatChartDate,
  getChartWatermark,
} from "@/components/ECharts"
import { tooltipRow, tooltipShell } from "@/components/ECharts/formatters"
import {
  formatAxisNumber,
  formatUsd,
} from "@/components/Profile/shared/analytics"
import { AnalyticsChartCard } from "@/components/Profile/shared/AnalyticsChartCard"
import {
  ChartPeriod,
  ChartPeriodSelector,
  groupPeriodData,
} from "@/components/Profile/shared/chartControls"
import { COLORS } from "@/theme/colors"

type CapitalAtRiskTimelineProps = {
  data: LenderCapitalAtRiskPoint[] | undefined
  isLoading: boolean
}

const RISK_SERIES = [
  {
    key: "healthyUsd",
    name: "Healthy",
    color: CHART_PALETTE.risk.healthy,
  },
  {
    key: "graceUsd",
    name: "In grace",
    color: CHART_PALETTE.risk.grace,
  },
  {
    key: "penaltyUsd",
    name: "Penalty-accruing",
    color: CHART_PALETTE.risk.penalty,
  },
  {
    key: "withdrawalQueueUsd",
    name: "Withdrawal queue",
    color: CHART_PALETTE.risk.withdrawalQueue,
  },
] as const

const csvCell = (value: string | number | null | undefined) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`

const buildCsv = (data: LenderCapitalAtRiskPoint[]) =>
  [
    [
      "Date",
      "Healthy USD",
      "In grace USD",
      "Penalty accruing USD",
      "Withdrawal queue USD",
      "Cumulative delinquency fees earned USD",
    ],
    ...data.map((point) => [
      formatChartDate(point.timestamp * 1000),
      point.healthyUsd,
      point.graceUsd,
      point.penaltyUsd,
      point.withdrawalQueueUsd,
      point.cumulativeDelinquencyFeesEarnedUsd,
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n")

const getValue = (value: unknown) => {
  if (Array.isArray(value)) return Number(value[1] ?? 0)
  return Number(value ?? 0)
}

const buildOption = (data: LenderCapitalAtRiskPoint[]): EChartOption => ({
  animation: false,
  graphic: getChartWatermark(),
  grid: { left: 12, right: 48, top: 42, bottom: 64, containLabel: true },
  legend: {
    type: "scroll",
    top: 0,
    right: 8,
    itemWidth: 10,
    itemHeight: 6,
    textStyle: {
      color: COLORS.santasGrey,
      fontFamily: "monospace",
      fontSize: 11,
    },
  },
  tooltip: {
    trigger: "axis",
    confine: true,
    backgroundColor: COLORS.blackRock,
    borderColor: COLORS.iron,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: {
      color: COLORS.white,
      fontFamily: "monospace",
      fontSize: 11,
    },
    axisPointer: {
      type: "cross",
      lineStyle: {
        color: CHART_PALETTE.semantic.primary,
        width: 1,
        opacity: 0.7,
      },
      crossStyle: {
        color: CHART_PALETTE.semantic.primary,
        opacity: 0.7,
      },
    },
    formatter: (params: unknown) => {
      const items = Array.isArray(params) ? params : [params]
      const timestamp = Number(items[0]?.axisValue ?? 0)
      const rows = items
        .filter((item) => Number.isFinite(getValue(item.value)))
        .map((item) =>
          tooltipRow({
            color: String(item.color ?? CHART_PALETTE.semantic.primary),
            label: String(item.seriesName ?? ""),
            value: formatUsd(getValue(item.value), { compact: true }),
          }),
        )
        .join("")
      const point = data.find((item) => item.timestamp * 1000 === timestamp)
      const totalExposure = point
        ? point.healthyUsd +
          point.graceUsd +
          point.penaltyUsd +
          point.withdrawalQueueUsd
        : 0

      return tooltipShell(
        formatChartDate(timestamp),
        [
          tooltipRow({
            color: COLORS.santasGrey,
            label: "Total exposure",
            value: formatUsd(totalExposure, { compact: true }),
          }),
          rows,
        ].join(""),
      )
    },
  },
  dataZoom: [
    {
      type: "inside",
      xAxisIndex: 0,
      start: 0,
      end: 100,
      filterMode: "filter",
    },
    {
      type: "slider",
      xAxisIndex: 0,
      start: 0,
      end: 100,
      height: 26,
      left: 12,
      right: 12,
      bottom: 8,
      borderColor: COLORS.black01,
      fillerColor: CHART_PALETTE.ui.zoomFill,
      backgroundColor: COLORS.blackRock006,
      dataBackground: {
        lineStyle: { color: COLORS.greySuit, opacity: 0.75 },
        areaStyle: { color: COLORS.greySuit, opacity: 0.18 },
      },
      selectedDataBackground: {
        lineStyle: { color: CHART_PALETTE.semantic.primary, opacity: 0.9 },
        areaStyle: { color: CHART_PALETTE.semantic.primary, opacity: 0.2 },
      },
      handleStyle: {
        borderColor: COLORS.blackRock,
        color: COLORS.white,
      },
      moveHandleStyle: {
        color: COLORS.black01,
      },
      textStyle: {
        color: COLORS.santasGrey,
        fontFamily: "monospace",
        fontSize: 10,
      },
      labelFormatter: (value: string | number) => formatAxisDate(Number(value)),
    },
  ],
  xAxis: {
    type: "time",
    boundaryGap: ["0%", "0%"],
    axisLine: { lineStyle: { color: COLORS.black01 } },
    axisTick: { show: false },
    axisLabel: {
      color: COLORS.santasGrey,
      fontFamily: "monospace",
      fontSize: 10,
      formatter: (value: number) => formatAxisDate(value),
    },
    splitLine: {
      lineStyle: {
        color: COLORS.athensGrey,
        type: "dashed",
        opacity: 0.9,
      },
    },
  },
  yAxis: [
    {
      type: "value",
      axisLine: { lineStyle: { color: COLORS.black01 } },
      axisTick: { show: false },
      axisLabel: {
        color: COLORS.santasGrey,
        fontFamily: "monospace",
        fontSize: 10,
        formatter: (value: number) => `$${formatAxisNumber(value)}`,
      },
      splitLine: {
        lineStyle: {
          color: COLORS.athensGrey,
          type: "dashed",
          opacity: 0.9,
        },
      },
    },
    {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: COLORS.santasGrey,
        fontFamily: "monospace",
        fontSize: 10,
        formatter: (value: number) => `$${formatAxisNumber(value)}`,
      },
      splitLine: { show: false },
    },
  ],
  series: [
    ...RISK_SERIES.map((series) => ({
      name: series.name,
      type: "line",
      stack: "risk",
      symbol: "none",
      smooth: true,
      lineStyle: {
        color: series.color,
        width: 1,
      },
      itemStyle: { color: series.color },
      areaStyle: {
        color: series.color,
        opacity: 0.56,
      },
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
        color: CHART_PALETTE.risk.penaltyFees,
        width: 1.2,
        type: "dashed",
        opacity: 0.78,
      },
      itemStyle: { color: CHART_PALETTE.risk.penaltyFees },
      data: data.map((point) => [
        point.timestamp * 1000,
        point.cumulativeDelinquencyFeesEarnedUsd,
      ]),
    },
  ],
})

export const CapitalAtRiskTimeline = ({
  data,
  isLoading,
}: CapitalAtRiskTimelineProps) => {
  const [period, setPeriod] = React.useState<ChartPeriod>("D")
  const chartData = React.useMemo(
    () =>
      groupPeriodData(
        data ?? [],
        period,
        (point, timestamp) => ({ ...point, timestamp }),
        (existing, point) => {
          existing.healthyUsd = point.healthyUsd
          existing.graceUsd = point.graceUsd
          existing.penaltyUsd = point.penaltyUsd
          existing.withdrawalQueueUsd = point.withdrawalQueueUsd
          existing.cumulativeDelinquencyFeesEarnedUsd =
            point.cumulativeDelinquencyFeesEarnedUsd
        },
      ),
    [data, period],
  )
  const option = React.useMemo(() => buildOption(chartData), [chartData])

  if (isLoading) {
    return (
      <Skeleton
        variant="rounded"
        height={340}
        sx={{ bgcolor: COLORS.athensGrey }}
      />
    )
  }

  if (!data || data.length === 0) return null

  return (
    <AnalyticsChartCard
      title="Capital-at-risk timeline"
      description="Exposure by market state, queued withdrawals, and penalty fees earned."
      cardHeight={340}
      dialogHeight={560}
      constrainWidth
      actions={<ChartPeriodSelector value={period} onChange={setPeriod} />}
    >
      {() => (
        <Box sx={{ height: "100%", marginX: "auto", width: "80%" }}>
          <EChart
            option={option}
            ariaLabel="Lender capital at risk timeline"
            showExportActions
            exportButtonVariant="text"
            csvContent={buildCsv(chartData)}
            csvFileName={`lender-capital-at-risk-${period.toLowerCase()}.csv`}
            imageFileName={`lender-capital-at-risk-${period.toLowerCase()}.png`}
          />
        </Box>
      )}
    </AnalyticsChartCard>
  )
}
