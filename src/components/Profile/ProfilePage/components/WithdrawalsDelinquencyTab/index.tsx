"use client"

import * as React from "react"

import {
  Box,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material"

import {
  BorrowerCapitalCostPoint,
  BorrowerCureVelocityData,
  BorrowerWithdrawalBatchSummary,
  BorrowerProfileAnalytics,
} from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { useBorrowerBatches } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerBatches"
import { useBorrowerCapitalCostDrift } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerCapitalCostDrift"
import { useBorrowerCureVelocity } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerCureVelocity"
import { useBorrowerDelinquencyEvents } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerDelinquencyEvents"
import { LenderAnalyticsSummary } from "@/app/[locale]/lender/market/[address]/components/LenderAnalyticsSummary"
import {
  CategoryBarChart,
  CategoryBarSeries,
  ChartTooltipFormatter,
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
import { AnalyticsUnavailableNotice } from "@/components/Profile/shared/AnalyticsUnavailableNotice"
import { COLORS } from "@/theme/colors"

type WithdrawalsDelinquencyTabProps = {
  borrowerAddress: `0x${string}` | undefined
  analytics?: BorrowerProfileAnalytics
  isAnalyticsLoading: boolean
  analyticsAvailable: boolean
}

const EmptyPanel = ({ message }: { message: string }) => (
  <Box
    sx={{
      border: `1px dashed ${COLORS.iron}`,
      borderRadius: "12px",
      padding: "24px",
      textAlign: "center",
    }}
  >
    <Typography variant="text2" color={COLORS.santasGrey}>
      {message}
    </Typography>
  </Box>
)

const SectionCard = ({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) => (
  <Box
    sx={{
      border: `1px solid ${COLORS.athensGrey}`,
      borderRadius: "16px",
      backgroundColor: COLORS.white,
      padding: "24px",
    }}
  >
    <Typography
      variant="title2"
      display="block"
      sx={{ marginBottom: subtitle ? "6px" : "24px" }}
    >
      {title}
    </Typography>
    {subtitle && (
      <Typography
        variant="text3"
        color={COLORS.santasGrey}
        display="block"
        sx={{ marginBottom: "24px" }}
      >
        {subtitle}
      </Typography>
    )}
    <Box>{children}</Box>
  </Box>
)

const formatHours = (hours: number) => {
  if (!Number.isFinite(hours)) return "0h"
  if (hours >= 72) return `${Math.round(hours / 24)}d`
  return `${Math.round(hours)}h`
}

type DelinquencyChartRow = {
  name: string
  marketId: string
  delinquentHours: number
  eventCount: number
  longestHours: number
  averageHours: number
  lastEventTimestamp: number
}

type DelinquencySort = "hours" | "market" | "recent"

const DELINQUENCY_SERIES: CategoryBarSeries<DelinquencyChartRow>[] = [
  {
    key: "delinquentHours",
    name: "Delinquent",
    color: COLORS.galliano,
  },
]

type BatchChartMode = "amount" | "percent"
type BatchSort = "expiry" | "status" | "market" | "shortfall"

type BatchChartRow = BorrowerWithdrawalBatchSummary & {
  chartLabel: string
  chartPaid: number
  chartPaidLate: number
  chartUnpaid: number
  unpaidPct: number
}

const BATCH_PAID_COLOR = "#A9DBA1"
const BATCH_PAID_LATE_COLOR = "#EBC85F"
const BATCH_UNPAID_COLOR = "#F2AEB8"

const BATCH_SERIES: CategoryBarSeries<BatchChartRow>[] = [
  {
    key: "chartPaid",
    name: "Paid",
    color: BATCH_PAID_COLOR,
  },
  {
    key: "chartPaidLate",
    name: "Paid late",
    color: BATCH_PAID_LATE_COLOR,
  },
  {
    key: "chartUnpaid",
    name: "Unpaid",
    color: BATCH_UNPAID_COLOR,
    colors: (batch) =>
      batch.status === "unpaid" ? COLORS.carminePink : BATCH_UNPAID_COLOR,
  },
]

const ChartToggleGroup = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) => (
  <ToggleButtonGroup
    exclusive
    size="small"
    value={value}
    onChange={(_, nextValue: T | null) => {
      if (nextValue) onChange(nextValue)
    }}
    sx={{
      "& .MuiToggleButton-root": {
        borderColor: COLORS.athensGrey,
        color: COLORS.santasGrey,
        fontSize: 10,
        lineHeight: 1,
        padding: "5px 7px",
        textTransform: "none",
      },
      "& .Mui-selected": {
        backgroundColor: `${COLORS.ultramarineBlue}14 !important`,
        color: `${COLORS.ultramarineBlue} !important`,
      },
    }}
  >
    {options.map((option) => (
      <ToggleButton key={option.value} value={option.value}>
        {option.label}
      </ToggleButton>
    ))}
  </ToggleButtonGroup>
)

const getDelinquencyTooltip: ChartTooltipFormatter<DelinquencyChartRow> = (
  params,
  data,
) => {
  const category = String(params[0]?.axisValue ?? params[0]?.name ?? "")
  const row = data.find((item) => item.name === category)
  if (!row) return ""

  return tooltipShell(
    row.name,
    [
      tooltipRow({
        color: COLORS.galliano,
        label: "Total hours",
        value: formatHours(row.delinquentHours),
      }),
      tooltipRow({
        color: COLORS.santasGrey,
        label: "Events",
        value: String(row.eventCount),
      }),
      tooltipRow({
        color: COLORS.santasGrey,
        label: "Longest event",
        value: formatHours(row.longestHours),
      }),
      tooltipRow({
        color: COLORS.santasGrey,
        label: "Avg cure time",
        value: formatHours(row.averageHours),
      }),
    ].join(""),
  )
}

const getBatchTooltip =
  (mode: BatchChartMode): ChartTooltipFormatter<BatchChartRow> =>
  (params, data) => {
    const category = String(params[0]?.axisValue ?? params[0]?.name ?? "")
    const row = data.find((item) => item.chartLabel === category)
    if (!row) return ""

    return tooltipShell(
      row.chartLabel,
      [
        tooltipRow({
          color: COLORS.santasGrey,
          label: "Requested",
          value: formatUsd(row.requested, { compact: true }),
        }),
        tooltipRow({
          color: BATCH_PAID_COLOR,
          label: mode === "percent" ? "Paid %" : "Paid",
          value:
            mode === "percent"
              ? `${row.chartPaid.toFixed(1)}%`
              : formatUsd(row.paid, { compact: true }),
        }),
        tooltipRow({
          color: BATCH_PAID_LATE_COLOR,
          label: mode === "percent" ? "Paid late %" : "Paid late",
          value:
            mode === "percent"
              ? `${row.chartPaidLate.toFixed(1)}%`
              : formatUsd(row.paidLate, { compact: true }),
        }),
        tooltipRow({
          color:
            row.status === "unpaid" ? COLORS.carminePink : BATCH_UNPAID_COLOR,
          label: mode === "percent" ? "Unpaid %" : "Unpaid",
          value:
            mode === "percent"
              ? `${row.chartUnpaid.toFixed(1)}%`
              : formatUsd(row.unpaid, { compact: true }),
        }),
        tooltipRow({
          color: COLORS.carminePink,
          label: "Shortfall",
          value: formatUsd(row.shortfall, { compact: true }),
        }),
        tooltipRow({
          color: COLORS.santasGrey,
          label: "Shortfall %",
          value: `${row.unpaidPct.toFixed(1)}%`,
        }),
      ].join(""),
    )
  }

const sortDelinquencyRows = (
  rows: DelinquencyChartRow[],
  sort: DelinquencySort,
) =>
  rows.slice().sort((left, right) => {
    if (sort === "market") return left.name.localeCompare(right.name)
    if (sort === "recent")
      return right.lastEventTimestamp - left.lastEventTimestamp
    return right.delinquentHours - left.delinquentHours
  })

const sortBatchRows = (rows: BatchChartRow[], sort: BatchSort) =>
  rows.slice().sort((left, right) => {
    if (sort === "market")
      return left.marketName.localeCompare(right.marketName)
    if (sort === "status") return left.status.localeCompare(right.status)
    if (sort === "shortfall") return right.shortfall - left.shortfall
    return left.expiryTimestamp - right.expiryTimestamp
  })

const csvCell = (value: string | number | boolean | null | undefined) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`

const buildCsv = (rows: Array<Array<string | number | boolean | null>>) =>
  rows.map((row) => row.map(csvCell).join(",")).join("\n")

const buildDelinquencyCsv = (rows: DelinquencyChartRow[]) =>
  buildCsv([
    [
      "Market",
      "Market ID",
      "Total delinquent hours",
      "Event count",
      "Longest event hours",
      "Average cure hours",
      "Last event",
    ],
    ...rows.map((row) => [
      row.name,
      row.marketId,
      row.delinquentHours,
      row.eventCount,
      row.longestHours,
      row.averageHours,
      row.lastEventTimestamp
        ? formatChartDate(row.lastEventTimestamp * 1000)
        : "",
    ]),
  ])

const buildBatchCsv = (rows: BatchChartRow[]) =>
  buildCsv([
    [
      "Batch",
      "Expiry",
      "Market",
      "Status",
      "Requested USD",
      "Paid USD",
      "Paid late USD",
      "Unpaid USD",
      "Unpaid %",
      "Shortfall USD",
    ],
    ...rows.map((row) => [
      row.label,
      formatChartDate(row.expiryTimestamp * 1000),
      row.marketName,
      row.status,
      row.requested,
      row.paid,
      row.paidLate,
      row.unpaid,
      row.unpaidPct,
      row.shortfall,
    ]),
  ])

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
          color: isPenalty ? COLORS.carminePink : COLORS.ultramarineBlue,
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
          color: isPenalty ? COLORS.carminePink : COLORS.santasGrey,
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
        color: [
          COLORS.glitter,
          COLORS.hawkesBlue,
          COLORS.cornflowerBlue,
          COLORS.blueRibbon,
          COLORS.ultramarineBlue,
          COLORS.blackRock,
        ],
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
                color: COLORS.galliano,
                fontFamily: "monospace",
                fontSize: 10,
                formatter: () => `Protocol median ${formatHours(median ?? 0)}`,
              },
              lineStyle: {
                color: COLORS.galliano,
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
                borderColor: COLORS.carminePink,
                borderWidth: 2,
                opacity: 0.95,
              },
              emphasis: {
                itemStyle: {
                  borderWidth: 2.5,
                  shadowBlur: 10,
                  shadowColor: COLORS.carminePink,
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
            color: String(item.color ?? COLORS.ultramarineBlue),
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
      fillerColor: COLORS.blueRibbon01,
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
      itemStyle: { color: COLORS.ultramarineBlue },
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
      itemStyle: { color: COLORS.carminePink },
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
      itemStyle: { color: COLORS.greySuit },
      data: data.map((point) => [point.timestamp * 1000, point.protocolFees]),
    },
    {
      name: "Stated APR",
      type: "line",
      yAxisIndex: 1,
      smooth: false,
      symbol: "none",
      lineStyle: { width: 1.1, type: "dashed", opacity: 0.75 },
      itemStyle: { color: COLORS.galliano },
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

export const WithdrawalsDelinquencyTab = ({
  borrowerAddress,
  analytics,
  isAnalyticsLoading,
  analyticsAvailable,
}: WithdrawalsDelinquencyTabProps) => {
  const [delinquencySort, setDelinquencySort] =
    React.useState<DelinquencySort>("hours")
  const [batchSort, setBatchSort] = React.useState<BatchSort>("expiry")
  const [batchMode, setBatchMode] = React.useState<BatchChartMode>("amount")
  const marketIds = analytics?.marketIds ?? []
  const delinquencyQuery = useBorrowerDelinquencyEvents(
    borrowerAddress,
    marketIds,
    analytics?.gracePeriodMap ?? {},
    analytics?.nameMap ?? {},
  )
  const batchesQuery = useBorrowerBatches(
    borrowerAddress,
    marketIds,
    analytics?.priceMap ?? {},
  )
  const cureVelocityQuery = useBorrowerCureVelocity({
    borrowerAddress,
    marketIds,
    priceMap: analytics?.priceMap ?? {},
    gracePeriodMap: analytics?.gracePeriodMap ?? {},
  })
  const capitalCostQuery = useBorrowerCapitalCostDrift({
    borrowerAddress,
    marketIds,
    priceMap: analytics?.priceMap ?? {},
  })

  const delinquencyMetrics = React.useMemo(() => {
    const events = delinquencyQuery.data ?? []
    const chartDataMap = new Map<
      string,
      {
        name: string
        marketId: string
        delinquentHours: number
        eventCount: number
        longestHours: number
        totalHours: number
        lastEventTimestamp: number
      }
    >()

    events.forEach((event) => {
      const existing = chartDataMap.get(event.marketId) ?? {
        name: event.marketName,
        marketId: event.marketId,
        delinquentHours: 0,
        eventCount: 0,
        longestHours: 0,
        totalHours: 0,
        lastEventTimestamp: 0,
      }
      existing.delinquentHours += event.durationHours
      existing.eventCount += 1
      existing.longestHours = Math.max(
        existing.longestHours,
        event.durationHours,
      )
      existing.totalHours += event.durationHours
      existing.lastEventTimestamp = Math.max(
        existing.lastEventTimestamp,
        event.endTimestamp ?? event.startTimestamp,
      )
      chartDataMap.set(event.marketId, existing)
    })

    return {
      totalEvents: events.length,
      longestSingleDelinquency: Math.max(
        0,
        ...events.map((event) => event.durationHours),
      ),
      averageCureTime:
        events.length > 0
          ? Math.round(
              events.reduce((sum, event) => sum + event.durationHours, 0) /
                events.length,
            )
          : 0,
      penaltyEvents: events.filter((event) => event.penalized).length,
      chartData: Array.from(chartDataMap.values()).map((row) => ({
        name: row.name,
        marketId: row.marketId,
        delinquentHours: row.delinquentHours,
        eventCount: row.eventCount,
        longestHours: row.longestHours,
        averageHours:
          row.eventCount > 0 ? Math.round(row.totalHours / row.eventCount) : 0,
        lastEventTimestamp: row.lastEventTimestamp,
      })),
    }
  }, [delinquencyQuery.data])

  const delinquencyRows = React.useMemo(
    () => sortDelinquencyRows(delinquencyMetrics.chartData, delinquencySort),
    [delinquencyMetrics.chartData, delinquencySort],
  )

  const batchRows = React.useMemo(() => {
    const source = batchesQuery.data?.batches ?? []
    const rows = source.map<BatchChartRow>((batch) => {
      const safeRequested = batch.requested > 0 ? batch.requested : 1
      const unpaidPct = (batch.shortfall / safeRequested) * 100

      return {
        ...batch,
        chartLabel: `${batch.label} (${formatShortDate(
          batch.expiryTimestamp,
        )})`,
        chartPaid:
          batchMode === "percent"
            ? (batch.paid / safeRequested) * 100
            : batch.paid,
        chartPaidLate:
          batchMode === "percent"
            ? (batch.paidLate / safeRequested) * 100
            : batch.paidLate,
        chartUnpaid:
          batchMode === "percent"
            ? (batch.unpaid / safeRequested) * 100
            : batch.unpaid,
        unpaidPct,
      }
    })

    return sortBatchRows(rows, batchSort)
  }, [batchMode, batchSort, batchesQuery.data?.batches])

  if (!analyticsAvailable) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <AnalyticsUnavailableNotice />
      </Box>
    )
  }

  const renderDelinquency = () => {
    if (isAnalyticsLoading || delinquencyQuery.isLoading) {
      return (
        <Skeleton
          variant="rounded"
          height={320}
          sx={{ bgcolor: COLORS.athensGrey }}
        />
      )
    }
    if (delinquencyRows.length === 0) {
      return (
        <EmptyPanel message="No delinquency events found for this borrower." />
      )
    }

    return (
      <AnalyticsChartCard
        title="Delinquent hours by market"
        description="Aggregated hours spent delinquent across this borrower's markets."
        actions={
          <ChartToggleGroup
            value={delinquencySort}
            onChange={setDelinquencySort}
            options={[
              { value: "hours", label: "Highest" },
              { value: "market", label: "Market" },
              { value: "recent", label: "Recent" },
            ]}
          />
        }
        cardHeight={Math.max(260, delinquencyRows.length * 42)}
        dialogHeight={Math.max(360, delinquencyRows.length * 56)}
        constrainWidth
      >
        {() => (
          <CategoryBarChart
            data={delinquencyRows}
            categoryKey="name"
            series={DELINQUENCY_SERIES}
            horizontal
            formatValue={formatHours}
            tooltipFormatter={getDelinquencyTooltip}
            visualMap={{
              show: false,
              type: "continuous",
              min: 0,
              max: Math.max(
                1,
                ...delinquencyRows.map((row) => row.delinquentHours),
              ),
              dimension: 0,
              inRange: {
                color: [COLORS.lightGreen, COLORS.galliano, COLORS.carminePink],
              },
            }}
            showDataZoom={delinquencyRows.length > 8}
            yAxisWidth={170}
            showExportActions
            exportButtonVariant="text"
            csvContent={buildDelinquencyCsv(delinquencyRows)}
            csvFileName="borrower-delinquent-hours.csv"
            imageFileName="borrower-delinquent-hours.png"
            ariaLabel="Delinquent hours by market"
          />
        )}
      </AnalyticsChartCard>
    )
  }

  const renderBatches = () => {
    if (isAnalyticsLoading || batchesQuery.isLoading) {
      return (
        <Skeleton
          variant="rounded"
          height={420}
          sx={{ bgcolor: COLORS.athensGrey }}
        />
      )
    }
    if (!batchesQuery.data) {
      return <EmptyPanel message="Withdrawal data is unavailable right now." />
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {batchRows.length === 0 ? (
          <EmptyPanel message="No expired withdrawal batches for this borrower." />
        ) : (
          <AnalyticsChartCard
            title="Batch outcomes"
            description="Requested USD value per expired batch, bucketed by final outcome."
            actions={
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexWrap: "wrap",
                }}
              >
                <ChartToggleGroup
                  value={batchMode}
                  onChange={setBatchMode}
                  options={[
                    { value: "amount", label: "USD" },
                    { value: "percent", label: "%" },
                  ]}
                />
                <ChartToggleGroup
                  value={batchSort}
                  onChange={setBatchSort}
                  options={[
                    { value: "expiry", label: "Expiry" },
                    { value: "status", label: "Status" },
                    { value: "market", label: "Market" },
                    { value: "shortfall", label: "Shortfall" },
                  ]}
                />
              </Box>
            }
            cardHeight={280}
            constrainWidth
          >
            {() => (
              <CategoryBarChart
                data={batchRows}
                categoryKey="chartLabel"
                series={BATCH_SERIES}
                stacked
                showDataZoom={batchRows.length > 8}
                formatValue={(value) =>
                  batchMode === "percent"
                    ? `${Math.round(value)}%`
                    : formatUsd(value, { compact: true })
                }
                tooltipFormatter={getBatchTooltip(batchMode)}
                markLine={{
                  value:
                    batchMode === "percent"
                      ? 100
                      : batchRows.reduce(
                          (sum, batch) => sum + batch.shortfall,
                          0,
                        ) / batchRows.length,
                  name: batchMode === "percent" ? "100% paid" : "Avg shortfall",
                  color: COLORS.ultramarineBlue,
                }}
                showExportActions
                exportButtonVariant="text"
                csvContent={buildBatchCsv(batchRows)}
                csvFileName={`borrower-batch-outcomes-${batchMode}.csv`}
                imageFileName={`borrower-batch-outcomes-${batchMode}.png`}
                ariaLabel="Expired withdrawal batch outcomes"
              />
            )}
          </AnalyticsChartCard>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: "16px",
          }}
        >
          <Box
            sx={{
              border: `1px solid ${COLORS.athensGrey}`,
              borderRadius: "14px",
              padding: "20px",
            }}
          >
            <Typography variant="text2Highlighted">
              Aggregate batch stats
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginTop: "16px",
              }}
            >
              {[
                ["Expired batches", String(batchesQuery.data.totalExpired)],
                ["Fully paid at expiry", `${batchesQuery.data.fullyPaidPct}%`],
                ["Paid late", String(batchesQuery.data.paidLateCount)],
                ["Unpaid", String(batchesQuery.data.unpaidCount)],
                ["Avg shortfall", `${batchesQuery.data.avgShortfallPct}%`],
              ].map(([label, value]) => (
                <Box
                  key={label}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <Typography variant="text2" color={COLORS.santasGrey}>
                    {label}
                  </Typography>
                  <Typography variant="text2Highlighted">{value}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box
            sx={{
              border: `1px solid ${COLORS.athensGrey}`,
              borderRadius: "14px",
              padding: "20px",
            }}
          >
            <Typography variant="text2Highlighted">Current queue</Typography>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginTop: "16px",
              }}
            >
              {[
                ["Pending batches", String(batchesQuery.data.pendingBatches)],
                [
                  "Queued value",
                  formatUsd(batchesQuery.data.totalQueued, { compact: true }),
                ],
                ["Next expiry", batchesQuery.data.nextExpiry],
              ].map(([label, value]) => (
                <Box
                  key={label}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <Typography variant="text2" color={COLORS.santasGrey}>
                    {label}
                  </Typography>
                  <Typography variant="text2Highlighted">{value}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
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
        description={`Each dot is one cured delinquency. Color depth reflects liquidity gap; red ring marks penalty events. ${descriptionParts}.`}
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

    if (!capitalCostQuery.data || capitalCostQuery.data.length === 0) {
      return <EmptyPanel message="No daily capital cost data found." />
    }

    return (
      <AnalyticsChartCard
        title="Cost of capital and APR drift"
        description="Daily base interest, delinquency fees, and protocol fees with stated vs effective APR."
        cardHeight={340}
        dialogHeight={560}
        constrainWidth
      >
        {() => (
          <EChart
            option={buildCapitalCostOption(capitalCostQuery.data!)}
            ariaLabel="Borrower cost of capital decomposition and APR drift"
            showExportActions
            exportButtonVariant="text"
            csvContent={buildCapitalCostCsv(capitalCostQuery.data!)}
            csvFileName="borrower-cost-of-capital-apr-drift.csv"
            imageFileName="borrower-cost-of-capital-apr-drift.png"
          />
        )}
      </AnalyticsChartCard>
    )
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <SectionCard
        title="Delinquency track record"
        subtitle="Historical delinquency behaviour across all markets."
      >
        <LenderAnalyticsSummary
          isLoading={isAnalyticsLoading || delinquencyQuery.isLoading}
          items={[
            {
              label: "Total events",
              value: String(delinquencyMetrics.totalEvents),
            },
            {
              label: "Longest event",
              value: formatHours(delinquencyMetrics.longestSingleDelinquency),
            },
            {
              label: "Avg cure time",
              value: formatHours(delinquencyMetrics.averageCureTime),
            },
            {
              label: "Penalty events",
              value: String(delinquencyMetrics.penaltyEvents),
            },
          ]}
        />
        <Box sx={{ marginTop: "24px" }}>{renderDelinquency()}</Box>
      </SectionCard>

      <SectionCard
        title="Withdrawal processing"
        subtitle="Expired batch outcomes and current queue pressure."
      >
        {renderBatches()}
      </SectionCard>

      <SectionCard
        title="Credit behaviour analytics"
        subtitle="Delinquency cure speed and realized cost of capital over time."
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {renderCureVelocity()}
          {renderCapitalCost()}
        </Box>
      </SectionCard>
    </Box>
  )
}
