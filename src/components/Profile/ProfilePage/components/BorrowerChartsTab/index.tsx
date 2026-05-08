"use client"

import * as React from "react"

import { Box, Skeleton } from "@mui/material"

import {
  BorrowerCapitalCostPoint,
  BorrowerCureVelocityData,
  BorrowerProfileAnalytics,
} from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { useBorrowerCapitalCostDrift } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerCapitalCostDrift"
import { useBorrowerCureVelocity } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerCureVelocity"
import {
  CHART_PALETTE,
  EChart,
  EChartOption,
  formatChartDate,
  getChartWatermark,
} from "@/components/ECharts"
import { tooltipRow, tooltipShell } from "@/components/ECharts/formatters"
import {
  formatAxisNumber,
  formatPercent,
  formatShortDate,
  formatUsd,
} from "@/components/Profile/shared/analytics"
import { AnalyticsChartCard } from "@/components/Profile/shared/AnalyticsChartCard"
import {
  AnalyticsSectionCard,
  EmptyPanel,
} from "@/components/Profile/shared/AnalyticsPanels"
import { AnalyticsUnavailableNotice } from "@/components/Profile/shared/AnalyticsUnavailableNotice"
import {
  ChartPeriod,
  ChartPeriodSelector,
  groupPeriodData,
} from "@/components/Profile/shared/chartControls"
import { buildCsv } from "@/components/Profile/shared/chartExport"
import { COLORS } from "@/theme/colors"

type BorrowerChartsTabProps = {
  borrowerAddress: `0x${string}` | undefined
  chainId?: number
  analytics?: BorrowerProfileAnalytics
  isAnalyticsLoading: boolean
  analyticsAvailable: boolean
}

const formatHours = (hours: number) => {
  if (!Number.isFinite(hours)) return "0h"
  if (hours >= 72) return `${Math.round(hours / 24)}d`
  return `${Math.round(hours)}h`
}

const buildCureVelocityCsv = (data: BorrowerCureVelocityData) =>
  buildCsv([
    [
      "Market",
      "Market ID",
      "Started",
      "Cured",
      "Liquidity gap USD",
      "Hours to cure",
      "Delinquency fees USD",
      "Penalty reached",
      "Protocol median cure hours",
    ],
    ...data.points.map((point) => [
      point.marketName,
      point.marketId,
      formatChartDate(point.startTimestamp * 1000),
      formatChartDate(point.endTimestamp * 1000),
      point.severityUsd,
      point.cureHours,
      point.delinquencyFeesUsd,
      point.penalized,
      data.protocolMedianCureHours ?? "",
    ]),
  ])

const buildCapitalCostCsv = (data: BorrowerCapitalCostPoint[]) =>
  buildCsv([
    [
      "Date",
      "Base interest USD",
      "Delinquency fees USD",
      "Protocol fees USD",
      "Stated APR",
      "Effective APR",
      "Total debt USD",
    ],
    ...data.map((point) => [
      formatChartDate(point.timestamp * 1000),
      point.baseInterest,
      point.delinquencyFees,
      point.protocolFees,
      point.statedApr,
      point.effectiveApr,
      point.totalDebtUsd,
    ]),
  ])

const getChartValue = (value: unknown) => {
  if (Array.isArray(value)) return Number(value[1] ?? 0)
  return Number(value ?? 0)
}

const MIN_DISPLAY_HOURS = 0.05
const BEESWARM_BIN_COUNT = 64

const formatCureAxisHours = (hours: number) => {
  if (!Number.isFinite(hours) || hours <= 0) return "0"
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${Math.max(1, minutes)}m`
  }
  if (hours < 72) return `${Math.round(hours)}h`
  return `${Math.round(hours / 24)}d`
}

const buildCureVelocityOption = (
  data: BorrowerCureVelocityData,
): EChartOption => {
  const points = data.points
    .map((point) => ({
      ...point,
      displayHours: Math.max(point.cureHours, MIN_DISPLAY_HOURS),
    }))
    .sort((left, right) => left.displayHours - right.displayHours)

  const minHours = MIN_DISPLAY_HOURS
  const maxHours = Math.max(
    points[points.length - 1]?.displayHours ?? minHours * 4,
    minHours * 4,
  )
  const logMin = Math.log10(minHours)
  const logMax = Math.log10(maxHours)
  const binSize = (logMax - logMin) / BEESWARM_BIN_COUNT

  const binCounts = new Map<number, number>()
  points.forEach((point) => {
    const idx = Math.min(
      BEESWARM_BIN_COUNT - 1,
      Math.floor((Math.log10(point.displayHours) - logMin) / binSize),
    )
    binCounts.set(idx, (binCounts.get(idx) ?? 0) + 1)
  })
  const maxBinCount = Math.max(8, ...Array.from(binCounts.values()))

  const binPositions = new Map<number, number>()
  const withinGrace: Array<unknown[]> = []
  const penalty: Array<unknown[]> = []

  points.forEach((point) => {
    const idx = Math.min(
      BEESWARM_BIN_COUNT - 1,
      Math.floor((Math.log10(point.displayHours) - logMin) / binSize),
    )
    const pos = binPositions.get(idx) ?? 0
    binPositions.set(idx, pos + 1)
    const yIdx = pos % 2 === 0 ? pos / 2 : -((pos + 1) / 2)
    const y = (yIdx / maxBinCount) * 2

    const row = [
      point.displayHours,
      y,
      Math.log10(Math.max(0, point.severityUsd) + 1),
      point.delinquencyFeesUsd,
      point.marketName,
      point.startTimestamp,
      point.cureHours,
      point.severityUsd,
    ]

    if (point.penalized) penalty.push(row)
    else withinGrace.push(row)
  })

  const maxSeverity = Math.max(0, ...points.map((point) => point.severityUsd))
  const maxLogSeverity = Math.log10(maxSeverity + 1)
  const median = data.protocolMedianCureHours
  const hasMedian = median !== null && median !== undefined && median > 0

  const tooltipFormatter = (param: { data?: unknown; seriesName?: string }) => {
    const row = Array.isArray(param.data) ? param.data : []
    if (!row.length) return ""
    const fees = Number(row[3] ?? 0)
    const market = String(row[4] ?? "")
    const ts = Number(row[5] ?? 0)
    const cureHours = Number(row[6] ?? 0)
    const severity = Number(row[7] ?? 0)
    const isPenalty = param.seriesName === "Penalty reached"

    return tooltipShell(
      market,
      [
        tooltipRow({
          color: isPenalty
            ? CHART_PALETTE.semantic.danger
            : CHART_PALETTE.semantic.primary,
          label: "Cure time",
          value: formatCureAxisHours(cureHours),
        }),
        tooltipRow({
          color: COLORS.santasGrey,
          label: "Liquidity gap",
          value: formatUsd(severity, { compact: true }),
        }),
        tooltipRow({
          color: COLORS.santasGrey,
          label: "Fees accrued",
          value: formatUsd(fees, { compact: true }),
        }),
        tooltipRow({
          color: isPenalty ? CHART_PALETTE.semantic.danger : COLORS.santasGrey,
          label: "Status",
          value: isPenalty ? "Penalty reached" : "Within grace",
        }),
        tooltipRow({
          color: COLORS.santasGrey,
          label: "Started",
          value: formatChartDate(ts * 1000),
        }),
      ].join(""),
    )
  }

  return {
    animation: false,
    graphic: getChartWatermark(),
    grid: { left: 12, right: 24, top: 24, bottom: 78, containLabel: true },
    tooltip: {
      trigger: "item",
      confine: true,
      backgroundColor: COLORS.blackRock,
      borderColor: COLORS.iron,
      borderWidth: 1,
      textStyle: { color: COLORS.white, fontFamily: "monospace", fontSize: 11 },
      formatter: tooltipFormatter,
    },
    visualMap: {
      type: "continuous",
      seriesIndex: penalty.length > 0 ? [0, 1] : [0],
      dimension: 2,
      min: 0,
      max: Math.max(1, maxLogSeverity),
      orient: "horizontal",
      left: "center",
      bottom: 4,
      itemWidth: 10,
      itemHeight: 110,
      text: [`${formatUsd(maxSeverity, { compact: true })} gap`, "$0 gap"],
      textStyle: {
        color: COLORS.santasGrey,
        fontFamily: "monospace",
        fontSize: 10,
      },
      inRange: {
        color: CHART_PALETTE.severityRamp,
      },
      calculable: false,
    },
    xAxis: {
      type: "log",
      logBase: 10,
      min: minHours,
      max: maxHours,
      name: "Hours to cure (log)",
      nameLocation: "middle",
      nameGap: 30,
      nameTextStyle: {
        color: COLORS.santasGrey,
        fontFamily: "monospace",
        fontSize: 10,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: COLORS.santasGrey,
        fontFamily: "monospace",
        fontSize: 10,
        formatter: (value: number) => formatCureAxisHours(value),
      },
      splitLine: {
        lineStyle: { color: COLORS.athensGrey, type: "dashed" },
      },
    },
    yAxis: {
      type: "value",
      min: -1.05,
      max: 1.05,
      show: false,
      splitLine: { show: false },
    },
    series: [
      {
        name: "Within grace",
        type: "scatter",
        data: withinGrace,
        symbol: "circle",
        symbolSize: 6,
        itemStyle: {
          borderColor: COLORS.white,
          borderWidth: 0.6,
          opacity: 0.9,
        },
        emphasis: {
          itemStyle: {
            borderWidth: 1.5,
            shadowBlur: 8,
            shadowColor: COLORS.blackRock07,
          },
        },
        markLine: hasMedian
          ? {
              silent: true,
              symbol: "none",
              animation: false,
              label: {
                show: true,
                position: "insideEndTop",
                color: CHART_PALETTE.semantic.warning,
                fontFamily: "monospace",
                fontSize: 10,
                formatter: () => `Protocol median ${formatHours(median ?? 0)}`,
              },
              lineStyle: {
                color: CHART_PALETTE.semantic.warning,
                type: "dashed",
                width: 1.4,
              },
              data: [{ xAxis: median ?? 0 }],
            }
          : undefined,
      },
      ...(penalty.length > 0
        ? [
            {
              name: "Penalty reached",
              type: "scatter",
              data: penalty,
              symbol: "circle",
              symbolSize: 8,
              itemStyle: {
                borderColor: CHART_PALETTE.semantic.danger,
                borderWidth: 2,
                opacity: 0.95,
              },
              emphasis: {
                itemStyle: {
                  borderWidth: 2.5,
                  shadowBlur: 10,
                  shadowColor: CHART_PALETTE.semantic.danger,
                },
              },
            },
          ]
        : []),
    ],
  }
}

const buildCapitalCostOption = (
  data: BorrowerCapitalCostPoint[],
): EChartOption => ({
  animation: false,
  graphic: getChartWatermark(),
  grid: { left: 12, right: 54, top: 36, bottom: 60, containLabel: true },
  tooltip: {
    trigger: "axis",
    confine: true,
    backgroundColor: COLORS.blackRock,
    borderColor: COLORS.iron,
    borderWidth: 1,
    textStyle: { color: COLORS.white, fontFamily: "monospace", fontSize: 11 },
    formatter: (
      params: Array<{
        axisValue?: string | number
        color?: string
        seriesName?: string
        value?: unknown
      }>,
    ) => {
      const items = Array.isArray(params) ? params : [params]
      const timestamp = Number(items[0]?.axisValue ?? 0)
      const rows = items
        .map((item) => {
          const value = getChartValue(item.value)
          const isApr = item.seriesName?.includes("APR")
          return tooltipRow({
            color: String(item.color ?? CHART_PALETTE.semantic.primary),
            label: item.seriesName ?? "",
            value: isApr
              ? formatPercent(value, 2)
              : formatUsd(value, { compact: true }),
          })
        })
        .join("")

      return tooltipShell(formatChartDate(timestamp), rows)
    },
  },
  legend: {
    type: "scroll",
    top: 0,
    right: 8,
    icon: "roundRect",
    itemWidth: 12,
    itemHeight: 4,
    textStyle: {
      color: COLORS.santasGrey,
      fontFamily: "monospace",
      fontSize: 11,
    },
  },
  dataZoom: [
    { type: "inside", xAxisIndex: 0, start: 0, end: 100 },
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
      textStyle: {
        color: COLORS.santasGrey,
        fontFamily: "monospace",
        fontSize: 10,
      },
    },
  ],
  xAxis: {
    type: "time",
    boundaryGap: ["0%", "0%"],
    axisLabel: {
      color: COLORS.santasGrey,
      fontSize: 10,
      formatter: (value: number) => formatShortDate(value / 1000),
    },
    splitLine: { show: false },
  },
  yAxis: [
    {
      type: "value",
      axisLabel: {
        color: COLORS.santasGrey,
        fontSize: 10,
        formatter: (value: number) => `$${formatAxisNumber(value)}`,
      },
      splitLine: { lineStyle: { color: COLORS.athensGrey, type: "dashed" } },
    },
    {
      type: "value",
      axisLabel: {
        color: COLORS.santasGrey,
        fontSize: 10,
        formatter: (value: number) => formatPercent(value, 0),
      },
      splitLine: { show: false },
    },
  ],
  series: [
    {
      name: "Base interest",
      type: "line",
      stack: "cost",
      smooth: false,
      symbol: "none",
      lineStyle: { width: 1, opacity: 0.72 },
      areaStyle: { opacity: 0.16 },
      itemStyle: { color: CHART_PALETTE.semantic.primary },
      data: data.map((point) => [point.timestamp * 1000, point.baseInterest]),
    },
    {
      name: "Delinquency fees",
      type: "line",
      stack: "cost",
      smooth: false,
      symbol: "none",
      lineStyle: { width: 1, opacity: 0.72 },
      areaStyle: { opacity: 0.2 },
      itemStyle: { color: CHART_PALETTE.semantic.danger },
      data: data.map((point) => [
        point.timestamp * 1000,
        point.delinquencyFees,
      ]),
    },
    {
      name: "Protocol fees",
      type: "line",
      stack: "cost",
      smooth: false,
      symbol: "none",
      lineStyle: { width: 1, opacity: 0.62 },
      areaStyle: { opacity: 0.18 },
      itemStyle: { color: CHART_PALETTE.semantic.neutral },
      data: data.map((point) => [point.timestamp * 1000, point.protocolFees]),
    },
    {
      name: "Stated APR",
      type: "line",
      yAxisIndex: 1,
      smooth: false,
      symbol: "none",
      lineStyle: { width: 1.1, type: "dashed", opacity: 0.75 },
      itemStyle: { color: CHART_PALETTE.semantic.warning },
      data: data.map((point) => [point.timestamp * 1000, point.statedApr]),
    },
    {
      name: "Effective APR",
      type: "line",
      yAxisIndex: 1,
      smooth: false,
      symbol: "none",
      lineStyle: { width: 1.1, opacity: 0.82 },
      itemStyle: { color: COLORS.blackRock },
      data: data.map((point) => [point.timestamp * 1000, point.effectiveApr]),
    },
  ],
})

export const BorrowerChartsTab = ({
  borrowerAddress,
  chainId,
  analytics,
  isAnalyticsLoading,
  analyticsAvailable,
}: BorrowerChartsTabProps) => {
  const [capitalCostPeriod, setCapitalCostPeriod] =
    React.useState<ChartPeriod>("D")
  const marketIds = analytics?.marketIds ?? []

  const cureVelocityQuery = useBorrowerCureVelocity({
    borrowerAddress,
    marketIds,
    priceMap: analytics?.priceMap ?? {},
    gracePeriodMap: analytics?.gracePeriodMap ?? {},
    chainId,
  })
  const capitalCostQuery = useBorrowerCapitalCostDrift({
    borrowerAddress,
    marketIds,
    priceMap: analytics?.priceMap ?? {},
    chainId,
  })

  const capitalCostRows = React.useMemo(
    () =>
      groupPeriodData(
        capitalCostQuery.data ?? [],
        capitalCostPeriod,
        (point, timestamp) => ({ ...point, timestamp }),
        (existing, point) => {
          existing.baseInterest += point.baseInterest
          existing.delinquencyFees += point.delinquencyFees
          existing.protocolFees += point.protocolFees
          existing.statedApr = point.statedApr
          existing.effectiveApr = point.effectiveApr
          existing.totalDebtUsd = point.totalDebtUsd
        },
      ),
    [capitalCostPeriod, capitalCostQuery.data],
  )

  if (!analyticsAvailable) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: { xs: "2px", md: "24px" },
        }}
      >
        <AnalyticsUnavailableNotice />
      </Box>
    )
  }

  const renderCureVelocity = () => {
    if (isAnalyticsLoading || cureVelocityQuery.isLoading) {
      return (
        <Skeleton
          variant="rounded"
          height={320}
          sx={{ bgcolor: COLORS.athensGrey }}
        />
      )
    }

    if (!cureVelocityQuery.data || cureVelocityQuery.data.points.length === 0) {
      return (
        <EmptyPanel message="No cured delinquency events found for this borrower." />
      )
    }

    const penaltyCount = cureVelocityQuery.data.points.filter(
      (point) => point.penalized,
    ).length
    const totalCount = cureVelocityQuery.data.points.length
    const medianHours = cureVelocityQuery.data.protocolMedianCureHours
    const descriptionParts = [
      `${totalCount} cure event${totalCount === 1 ? "" : "s"}`,
      penaltyCount > 0
        ? `${penaltyCount} reached penalty`
        : "none reached penalty",
      medianHours !== null && medianHours !== undefined
        ? `protocol median ${formatHours(medianHours)}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ")

    return (
      <AnalyticsChartCard
        title="Delinquency cure velocity"
        description={`Each dot is a recovered delinquency. Color shows liquidity gap; red rings mark penalty events. ${descriptionParts}.`}
        cardHeight={340}
        dialogHeight={560}
        constrainWidth
      >
        {() => (
          <EChart
            option={buildCureVelocityOption(cureVelocityQuery.data!)}
            ariaLabel="Borrower delinquency cure velocity"
            showExportActions
            exportButtonVariant="text"
            csvContent={buildCureVelocityCsv(cureVelocityQuery.data!)}
            csvFileName="borrower-delinquency-cure-velocity.csv"
            imageFileName="borrower-delinquency-cure-velocity.png"
          />
        )}
      </AnalyticsChartCard>
    )
  }

  const renderCapitalCost = () => {
    if (isAnalyticsLoading || capitalCostQuery.isLoading) {
      return (
        <Skeleton
          variant="rounded"
          height={320}
          sx={{ bgcolor: COLORS.athensGrey }}
        />
      )
    }

    if (capitalCostRows.length === 0) {
      return <EmptyPanel message="No daily capital cost data found." />
    }

    return (
      <AnalyticsChartCard
        title="Cost of capital and APR drift"
        description="Interest, protocol fees, delinquency fees, and effective APR."
        cardHeight={340}
        dialogHeight={560}
        constrainWidth
        actions={
          <ChartPeriodSelector
            value={capitalCostPeriod}
            onChange={setCapitalCostPeriod}
          />
        }
      >
        {() => (
          <EChart
            option={buildCapitalCostOption(capitalCostRows)}
            ariaLabel="Borrower cost of capital decomposition and APR drift"
            showExportActions
            exportButtonVariant="text"
            csvContent={buildCapitalCostCsv(capitalCostRows)}
            csvFileName={`borrower-cost-of-capital-${capitalCostPeriod.toLowerCase()}.csv`}
            imageFileName={`borrower-cost-of-capital-${capitalCostPeriod.toLowerCase()}.png`}
          />
        )}
      </AnalyticsChartCard>
    )
  }

  return (
    <AnalyticsSectionCard
      title="Borrower charts"
      subtitle="Cure speed and realized capital cost across this borrower."
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: { xs: "2px", md: "24px" },
        }}
      >
        {renderCureVelocity()}
        {renderCapitalCost()}
      </Box>
    </AnalyticsSectionCard>
  )
}
