"use client"

import { useMemo, useState } from "react"

import { Box, Skeleton } from "@mui/material"
import { useTranslation } from "react-i18next"

import {
  CHART_PALETTE,
  ChartTooltipFormatter,
  TimeSeriesChart,
  TimeSeriesConfig,
  formatChartDate,
} from "@/components/ECharts"
import { tooltipRow, tooltipShell } from "@/components/ECharts/formatters"
import { AnalyticsChartCard } from "@/components/Profile/shared/AnalyticsChartCard"
import {
  ChartPeriod,
  ChartPeriodSelector,
} from "@/components/Profile/shared/chartControls"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

import { ChartsGrid } from "./style"
import type { DailyFlowPoint } from "../../hooks/useMarketDailyFlows"

const DAY = 86_400

const MARKET_RANGE_PERIODS: ChartPeriod[] = ["W", "M", "Q", "Y", "All"]

const RANGE_LOOKBACK_SECONDS: Partial<Record<ChartPeriod, number | null>> = {
  W: 7 * DAY,
  M: 30 * DAY,
  Q: 90 * DAY,
  Y: 365 * DAY,
  All: null,
}

const DEFAULT_RANGE: ChartPeriod = "All"

const FLOWS_SERIES: TimeSeriesConfig<DailyFlowPoint>[] = [
  {
    key: "dailyDeposit",
    name: "Deposits",
    color: CHART_PALETTE.semantic.deposit,
    kind: "bar",
    stack: "deposits",
  },
  {
    key: "dailyWithdrawalRequestedNeg",
    name: "Withdrawals Requested",
    color: CHART_PALETTE.semantic.withdrawalSoft,
    kind: "bar",
    stack: "requested",
  },
  {
    key: "dailyWithdrawalExecutedNeg",
    name: "Withdrawals Executed",
    color: CHART_PALETTE.semantic.withdrawal,
    kind: "bar",
    stack: "executed",
  },
]

const NET_FLOW_SERIES: TimeSeriesConfig<DailyFlowPoint>[] = [
  {
    key: "netFlow",
    name: "Net Flow",
    color: CHART_PALETTE.semantic.deposit,
    kind: "area",
  },
]

const formatAmountWithSymbol = (symbol: string) => (value: number) => {
  const abs = Math.abs(value)
  let formatted: string
  if (abs >= 1e9) formatted = `${(abs / 1e9).toFixed(2)}B`
  else if (abs >= 1e6) formatted = `${(abs / 1e6).toFixed(2)}M`
  else if (abs >= 1e3) formatted = `${(abs / 1e3).toFixed(1)}K`
  else formatted = abs.toFixed(abs % 1 === 0 ? 0 : 2)
  return symbol ? `${formatted} ${symbol}` : formatted
}

const getFlowsTooltip =
  (symbol: string): ChartTooltipFormatter<DailyFlowPoint> =>
  (params, data) => {
    const items = Array.isArray(params) ? params : [params]
    const timestamp = Number(items[0]?.axisValue ?? 0) / 1000
    const point = data.find((p) => p.timestamp === timestamp)
    if (!point) return ""

    const fmt = formatAmountWithSymbol(symbol)
    const rows: string[] = []
    if (point.dailyDeposit) {
      rows.push(
        tooltipRow({
          color: CHART_PALETTE.semantic.deposit,
          label: "Deposits",
          value: fmt(point.dailyDeposit),
        }),
      )
    }
    if (point.dailyWithdrawalRequested) {
      rows.push(
        tooltipRow({
          color: CHART_PALETTE.semantic.withdrawalSoft,
          label: "Withdrawals Requested",
          value: fmt(point.dailyWithdrawalRequested),
        }),
      )
    }
    if (point.dailyWithdrawalExecuted) {
      rows.push(
        tooltipRow({
          color: CHART_PALETTE.semantic.withdrawal,
          label: "Withdrawals Executed",
          value: fmt(point.dailyWithdrawalExecuted),
        }),
      )
    }

    if (rows.length === 0) return ""
    return tooltipShell(formatChartDate(point.timestamp * 1000), rows.join(""))
  }

const getNetFlowTooltip =
  (symbol: string): ChartTooltipFormatter<DailyFlowPoint> =>
  (params, data) => {
    const items = Array.isArray(params) ? params : [params]
    const timestamp = Number(items[0]?.axisValue ?? 0) / 1000
    const point = data.find((p) => p.timestamp === timestamp)
    if (!point) return ""

    const fmt = formatAmountWithSymbol(symbol)
    return tooltipShell(
      formatChartDate(point.timestamp * 1000),
      tooltipRow({
        color: CHART_PALETTE.semantic.deposit,
        label: "Net Flow",
        value: fmt(point.netFlow),
      }),
    )
  }

const csvCell = (cell: unknown) => `"${String(cell).replaceAll('"', '""')}"`

const buildFlowsCsv = (data: DailyFlowPoint[], symbol: string) =>
  [
    [
      "Date",
      `Deposits (${symbol})`,
      `Withdrawals Requested (${symbol})`,
      `Withdrawals Executed (${symbol})`,
    ],
    ...data.map((p) => [
      p.date,
      p.dailyDeposit,
      p.dailyWithdrawalRequested,
      p.dailyWithdrawalExecuted,
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n")

const buildNetFlowCsv = (data: DailyFlowPoint[], symbol: string) =>
  [["Date", `Net Flow (${symbol})`], ...data.map((p) => [p.date, p.netFlow])]
    .map((row) => row.map(csvCell).join(","))
    .join("\n")

export const LenderFlowCharts = ({
  dailyFlows,
  isLoading,
  symbol,
}: {
  dailyFlows: DailyFlowPoint[]
  isLoading: boolean
  symbol: string
}) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()
  const [range, setRange] = useState<ChartPeriod>(DEFAULT_RANGE)

  const filtered = useMemo(() => {
    const lookback = RANGE_LOOKBACK_SECONDS[range]
    if (lookback == null) return dailyFlows
    const cutoff = Math.floor(Date.now() / 1000) - lookback
    return dailyFlows.filter((p) => p.timestamp >= cutoff)
  }, [dailyFlows, range])

  const rangeSelector = (
    <ChartPeriodSelector
      value={range}
      onChange={setRange}
      periods={MARKET_RANGE_PERIODS}
    />
  )

  if (isLoading) {
    return (
      <Box sx={ChartsGrid(isMobile)}>
        <Skeleton
          variant="rounded"
          height={280}
          sx={{ bgcolor: COLORS.athensGrey, borderRadius: "12px" }}
        />
        <Skeleton
          variant="rounded"
          height={280}
          sx={{ bgcolor: COLORS.athensGrey, borderRadius: "12px" }}
        />
      </Box>
    )
  }

  if (dailyFlows.length === 0) return null

  return (
    <Box sx={ChartsGrid(isMobile)}>
      <AnalyticsChartCard
        title={t("lenderMarketDetails.analytics.charts.dailyFlows")}
        description={t("lenderMarketDetails.analytics.charts.dailyFlowsDesc")}
        descriptionPosition="bottom"
        actions={rangeSelector}
      >
        {({ isExpanded }) => (
          <TimeSeriesChart
            data={filtered}
            series={FLOWS_SERIES}
            tooltipFormatter={getFlowsTooltip(symbol)}
            ariaLabel={t("lenderMarketDetails.analytics.charts.dailyFlows")}
            showLegend={isExpanded}
            showDataZoom={isExpanded}
            showExportActions={isExpanded}
            watermarkPlacement={isExpanded ? "cartesian" : "compact"}
            exportButtonVariant="text"
            csvContent={buildFlowsCsv(filtered, symbol)}
            csvFileName={`market-daily-flows-${range.toLowerCase()}.csv`}
            imageFileName={`market-daily-flows-${range.toLowerCase()}.png`}
          />
        )}
      </AnalyticsChartCard>

      <AnalyticsChartCard
        title={t("lenderMarketDetails.analytics.charts.cumulativeNetFlow")}
        description={t(
          "lenderMarketDetails.analytics.charts.cumulativeNetFlowDesc",
        )}
        descriptionPosition="bottom"
        actions={rangeSelector}
      >
        {({ isExpanded }) => (
          <TimeSeriesChart
            data={filtered}
            series={NET_FLOW_SERIES}
            tooltipFormatter={getNetFlowTooltip(symbol)}
            ariaLabel={t(
              "lenderMarketDetails.analytics.charts.cumulativeNetFlow",
            )}
            showLegend={isExpanded}
            showDataZoom={isExpanded}
            showExportActions={isExpanded}
            watermarkPlacement={isExpanded ? "cartesian" : "compact"}
            exportButtonVariant="text"
            csvContent={buildNetFlowCsv(filtered, symbol)}
            csvFileName={`market-net-flow-${range.toLowerCase()}.csv`}
            imageFileName={`market-net-flow-${range.toLowerCase()}.png`}
          />
        )}
      </AnalyticsChartCard>
    </Box>
  )
}
