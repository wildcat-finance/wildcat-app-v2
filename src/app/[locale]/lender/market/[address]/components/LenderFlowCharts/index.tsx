"use client"

import { useCallback, useMemo, useRef, useState } from "react"

import { Box, Skeleton, Typography } from "@mui/material"
import { Market } from "@wildcatfi/wildcat-sdk"
import type { ECharts } from "echarts/core"
import { useTranslation } from "react-i18next"

import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import {
  CHART_PALETTE,
  CategoryBarChart,
  CategoryBarSeries,
  ChartTooltipFormatter,
  ExportButton,
  TimeSeriesChart,
  TimeSeriesConfig,
  WATERMARK_IMAGE,
  formatChartDate,
} from "@/components/ECharts"
import { tooltipRow, tooltipShell } from "@/components/ECharts/formatters"
import { SeeMoreButton } from "@/components/Mobile/SeeMoreButton"
import { AnalyticsChartCard } from "@/components/Profile/shared/AnalyticsChartCard"
import {
  ChartPeriod,
  ChartPeriodSelector,
} from "@/components/Profile/shared/chartControls"
import { ChartDescriptionStyle } from "@/components/Profile/shared/chartStyle"
import { TooltipButton } from "@/components/TooltipButton"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { getMarketStatusChip } from "@/utils/marketStatus"

import { ChartsGrid } from "./style"
import type { DailyFlowPoint } from "../../hooks/useMarketDailyFlows"
import type { DelinquencyHistoryPoint } from "../../hooks/useMarketDelinquencyHistory"

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

const DELINQUENCY_SERIES: CategoryBarSeries<DelinquencyHistoryPoint>[] = [
  {
    key: "graceHours",
    name: "Within Grace",
    color: CHART_PALETTE.risk.grace,
    stack: "duration",
  },
  {
    key: "penaltyHours",
    name: "Penalty Time",
    color: CHART_PALETTE.risk.penalty,
    stack: "duration",
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

const formatDuration = (hours: number) => {
  if (!Number.isFinite(hours) || hours <= 0) return "0h"
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`
  if (hours < 24) return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)}h`

  const days = Math.floor(hours / 24)
  const remainingHours = Math.round(hours % 24)
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

const formatHoursLabel = (hours: number) => {
  if (!Number.isFinite(hours) || hours <= 0) return "0h"
  return `${Math.round(hours)}h`
}

const getDelinquencyStatus = (point: DelinquencyHistoryPoint) => {
  if (point.isActive) return "Delinquent now"
  if (point.isPenalized) return "Penalized"
  return "Cured in grace"
}

const getMetricToneColor = (tone: "default" | "danger") =>
  tone === "danger" ? COLORS.carminePink : COLORS.blackRock

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

const delinquencyTooltipFormatter: ChartTooltipFormatter<
  DelinquencyHistoryPoint
> = (params, data) => {
  const items = Array.isArray(params) ? params : [params]
  const dataIndex = items[0]?.dataIndex
  const point = typeof dataIndex === "number" ? data[dataIndex] : undefined
  if (!point) return ""

  return tooltipShell(
    `Event #${point.eventNumber} · ${point.label}${
      point.isActive ? " (active)" : ""
    }`,
    [
      tooltipRow({
        color: CHART_PALETTE.risk.grace,
        label: "Within Grace",
        value: formatDuration(point.graceHours),
      }),
      ...(point.penaltyHours > 0
        ? [
            tooltipRow({
              color: CHART_PALETTE.risk.penalty,
              label: "Penalty Time",
              value: formatDuration(point.penaltyHours),
            }),
          ]
        : []),
      tooltipRow({
        color: CHART_PALETTE.semantic.neutral,
        label: "Total Duration",
        value: formatDuration(point.durationHours),
      }),
      tooltipRow({
        color: point.isPenalized
          ? CHART_PALETTE.risk.penalty
          : CHART_PALETTE.risk.grace,
        label: "Status",
        value: getDelinquencyStatus(point),
      }),
      tooltipRow({
        color: CHART_PALETTE.semantic.neutral,
        label: "Started",
        value: point.startDate,
      }),
      tooltipRow({
        color: CHART_PALETTE.semantic.neutral,
        label: "Ended",
        value: point.endDate ?? "Active",
      }),
    ].join(""),
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

const buildDelinquencyCsv = (data: DelinquencyHistoryPoint[]) =>
  [
    [
      "Event",
      "Start Date",
      "End Date",
      "Duration Hours",
      "Within Grace Hours",
      "Penalty Hours",
      "Active",
      "Penalized",
      "Transaction Hash",
    ],
    ...data.map((p) => [
      p.eventNumber,
      p.startDate,
      p.endDate ?? "Active",
      p.durationHours,
      p.graceHours,
      p.penaltyHours,
      p.isActive ? "Yes" : "No",
      p.isPenalized ? "Yes" : "No",
      p.transactionHash,
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n")

const MetricCard = ({
  label,
  value,
  tone = "default",
  tooltip,
}: {
  label: string
  value: string
  tone?: "default" | "danger"
  tooltip?: string
}) => (
  <Box
    sx={{
      minWidth: 0,
      padding: "8px 12px",
      borderRadius: "10px",
      backgroundColor: COLORS.white,
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
      <Typography
        variant="text4"
        sx={{
          color: COLORS.santasGrey,
          lineHeight: 1.4,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
      {tooltip && <TooltipButton value={tooltip} />}
    </Box>
    <Typography
      variant="text1"
      sx={{
        color: getMetricToneColor(tone),
        lineHeight: 1.25,
        whiteSpace: "nowrap",
        display: "block",
      }}
    >
      {value}
    </Typography>
  </Box>
)

const CHART_ROW_HEIGHT = 30
const CHART_VERTICAL_PADDING = 24
const HTML_AXIS_HEIGHT = 28
const Y_AXIS_WIDTH = 72
const VALUE_LABEL_GUTTER = 74
const MAX_VISIBLE_ROWS = 10
const CSV_FILE_NAME = "market-delinquency-history.csv"
const IMAGE_FILE_NAME = "market-delinquency-history.png"

const DelinquencyLegend = () => (
  <Box
    sx={{
      padding: "8px 12px",
      borderRadius: "10px",
      backgroundColor: COLORS.white,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      gap: "4px",
      flexShrink: 0,
      marginLeft: "auto",
    }}
  >
    {[
      { color: CHART_PALETTE.risk.grace, label: "Within Grace" },
      { color: CHART_PALETTE.risk.penalty, label: "Penalty Time" },
    ].map((row) => (
      <Box
        key={row.label}
        sx={{ display: "flex", alignItems: "center", gap: "6px" }}
      >
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "2px",
            backgroundColor: row.color,
            flexShrink: 0,
          }}
        />
        <Typography
          variant="text4"
          sx={{
            color: COLORS.santasGrey,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
          }}
        >
          {row.label}
        </Typography>
      </Box>
    ))}
  </Box>
)

const downloadFromHref = (href: string, fileName: string) => {
  const link = document.createElement("a")
  link.href = href
  link.download = fileName
  link.click()
}

const DelinquencyChart = ({
  data,
  isExpanded,
}: {
  data: DelinquencyHistoryPoint[]
  isExpanded: boolean
}) => {
  const instanceRef = useRef<ECharts | null>(null)
  const handleReady = useCallback((instance: ECharts | null) => {
    instanceRef.current = instance
  }, [])

  const cardVisibleRows = Math.min(data.length, MAX_VISIBLE_ROWS)
  const innerHeight = data.length * CHART_ROW_HEIGHT + CHART_VERTICAL_PADDING
  const cardScrollHeight =
    data.length > cardVisibleRows
      ? cardVisibleRows * CHART_ROW_HEIGHT + CHART_VERTICAL_PADDING
      : innerHeight

  const csvContent = useMemo(() => buildDelinquencyCsv(data), [data])
  const maxDuration = useMemo(
    () => data.reduce((max, point) => Math.max(max, point.durationHours), 0),
    [data],
  )
  const axisTicks = useMemo(() => {
    const getTransform = (frac: number) => {
      if (frac === 0) return "none"
      if (frac === 1) return "translateX(-100%)"
      return "translateX(-50%)"
    }
    return [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
      frac,
      label: formatDuration(maxDuration * frac),
      transform: getTransform(frac),
    }))
  }, [maxDuration])

  const handleCsvExport = useCallback(() => {
    if (!csvContent) return
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    downloadFromHref(url, CSV_FILE_NAME)
    URL.revokeObjectURL(url)
  }, [csvContent])

  const handlePngExport = useCallback(() => {
    const instance = instanceRef.current
    if (!instance) return
    downloadFromHref(
      instance.getDataURL({
        type: "png",
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      }),
      IMAGE_FILE_NAME,
    )
  }, [])

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: "100%",
        flex: isExpanded ? 1 : "none",
        minHeight: 0,
      }}
    >
      {isExpanded && (
        <Box sx={{ display: "flex", gap: "4px" }}>
          <ExportButton label="CSV" onClick={handleCsvExport} variant="text" />
          <ExportButton label="PNG" onClick={handlePngExport} variant="text" />
        </Box>
      )}

      <Box
        sx={{
          position: "relative",
          width: "100%",
          flex: isExpanded ? 1 : "none",
          minHeight: 0,
          height: isExpanded ? "auto" : cardScrollHeight,
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <Box
            component="img"
            src={WATERMARK_IMAGE}
            alt=""
            draggable={false}
            sx={{ width: 240, height: 80, opacity: 0.05, objectFit: "contain" }}
          />
        </Box>

        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            height: "100%",
            overflowY: "auto",
          }}
        >
          <Box sx={{ width: "100%", height: innerHeight }}>
            <CategoryBarChart
              data={data}
              categoryKey="label"
              series={DELINQUENCY_SERIES}
              horizontal
              stacked
              showLegend={false}
              showWatermark={false}
              valueAxisVisible={false}
              formatValue={formatDuration}
              yAxisWidth={Y_AXIS_WIDTH}
              tooltipFormatter={delinquencyTooltipFormatter}
              valueLabel={{
                key: "durationHours",
                formatter: formatHoursLabel,
              }}
              ariaLabel="Delinquency History"
              csvContent={csvContent}
              csvFileName={CSV_FILE_NAME}
              imageFileName={IMAGE_FILE_NAME}
              showExportActions={false}
              onReady={handleReady}
            />
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          position: "relative",
          height: HTML_AXIS_HEIGHT,
          paddingLeft: `${Y_AXIS_WIDTH}px`,
          paddingRight: `${VALUE_LABEL_GUTTER}px`,
          flexShrink: 0,
        }}
      >
        <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
          {axisTicks.map((tick) => (
            <Typography
              key={tick.frac}
              variant="text4"
              sx={{
                position: "absolute",
                left: `${tick.frac * 100}%`,
                top: "8px",
                transform: tick.transform,
                color: COLORS.santasGrey,
                fontFamily: "monospace",
                whiteSpace: "nowrap",
              }}
            >
              {tick.label}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

const DelinquencyHistoryContent = ({
  data,
  gracePeriodHours,
  isExpanded,
}: {
  data: DelinquencyHistoryPoint[]
  gracePeriodHours: number
  isExpanded: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const penaltyEvents = data.filter((point) => point.isPenalized).length
  const longestDuration = data.reduce(
    (max, point) => Math.max(max, point.durationHours),
    0,
  )
  const avgDuration =
    data.length > 0
      ? data.reduce((sum, point) => sum + point.durationHours, 0) / data.length
      : 0

  if (data.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px dashed ${COLORS.iron}`,
          borderRadius: "8px",
          backgroundColor: COLORS.white,
          padding: "16px",
          textAlign: "center",
        }}
      >
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          This market has never been delinquent.
        </Typography>
      </Box>
    )
  }

  const caption = (
    <Typography sx={ChartDescriptionStyle}>
      Grace period: {formatDuration(gracePeriodHours)}. Yellow shows time before
      penalties; pink shows time after penalties began.
    </Typography>
  )

  const metricCards = (
    <>
      <MetricCard
        label="Total Events"
        value={String(data.length)}
        tooltip="Number of times this market has entered a delinquent state."
      />
      <MetricCard
        label="Longest"
        value={formatDuration(longestDuration)}
        tooltip="Duration of the longest single delinquency event."
      />
      <MetricCard
        label="Average Cure"
        value={formatDuration(avgDuration)}
        tooltip="Average time taken to resolve a delinquency event."
      />
      <MetricCard
        label="Penalty Events"
        value={String(penaltyEvents)}
        tone={penaltyEvents > 0 ? "danger" : "default"}
        tooltip="Number of delinquency events that exceeded the grace period and incurred penalty interest."
      />
    </>
  )

  return (
    <Box
      sx={{
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        height: isExpanded ? "100%" : undefined,
        paddingBottom: isExpanded ? "12px" : 0,
      }}
    >
      {isExpanded ? (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "stretch",
            gap: "16px",
            flexShrink: 0,
          }}
        >
          {metricCards}
          <DelinquencyLegend />
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          {metricCards}
        </Box>
      )}

      {isExpanded ? (
        <>
          <DelinquencyChart data={data} isExpanded />
          {caption}
        </>
      ) : (
        <>
          {isOpen && (
            <>
              <DelinquencyChart data={data} isExpanded={false} />
              {caption}
            </>
          )}
          <SeeMoreButton
            variant="accordion"
            isOpen={isOpen}
            setIsOpen={setIsOpen}
          />
        </>
      )}
    </Box>
  )
}

export const LenderFlowCharts = ({
  market,
  dailyFlows,
  isLoading,
  delinquencyHistory,
  isDelinquencyLoading,
  gracePeriodHours,
  symbol,
}: {
  market?: Market
  dailyFlows: DailyFlowPoint[]
  isLoading: boolean
  delinquencyHistory: DelinquencyHistoryPoint[]
  isDelinquencyLoading: boolean
  gracePeriodHours: number
  symbol: string
}) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()
  const [range, setRange] = useState<ChartPeriod>(DEFAULT_RANGE)
  const marketStatus = market ? getMarketStatusChip(market) : null

  const filtered = useMemo(() => {
    const lookback = RANGE_LOOKBACK_SECONDS[range]
    if (lookback == null) return dailyFlows
    const cutoff = Math.floor(Date.now() / 1000) - lookback
    return dailyFlows.filter((p) => p.timestamp >= cutoff)
  }, [dailyFlows, range])

  const flowsTooltip = useMemo(() => getFlowsTooltip(symbol), [symbol])
  const netFlowTooltip = useMemo(() => getNetFlowTooltip(symbol), [symbol])
  const flowsCsv = useMemo(
    () => buildFlowsCsv(filtered, symbol),
    [filtered, symbol],
  )
  const netFlowCsv = useMemo(
    () => buildNetFlowCsv(filtered, symbol),
    [filtered, symbol],
  )

  const rangeSelector = (
    <ChartPeriodSelector
      value={range}
      onChange={setRange}
      periods={MARKET_RANGE_PERIODS}
    />
  )

  return (
    <Box sx={ChartsGrid(isMobile)}>
      {isLoading && (
        <>
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
        </>
      )}

      {!isLoading && dailyFlows.length > 0 && (
        <>
          <AnalyticsChartCard
            title={t("lenderMarketDetails.analytics.charts.dailyFlows")}
            description={t(
              "lenderMarketDetails.analytics.charts.dailyFlowsDesc",
            )}
            descriptionPosition="bottom"
            actions={rangeSelector}
          >
            {({ isExpanded }) => (
              <TimeSeriesChart
                data={filtered}
                series={FLOWS_SERIES}
                tooltipFormatter={flowsTooltip}
                ariaLabel={t("lenderMarketDetails.analytics.charts.dailyFlows")}
                showLegend={isExpanded}
                showDataZoom={isExpanded}
                showExportActions={isExpanded}
                watermarkPlacement={isExpanded ? "cartesian" : "compact"}
                exportButtonVariant="text"
                csvContent={flowsCsv}
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
                tooltipFormatter={netFlowTooltip}
                ariaLabel={t(
                  "lenderMarketDetails.analytics.charts.cumulativeNetFlow",
                )}
                showLegend={isExpanded}
                showDataZoom={isExpanded}
                showExportActions={isExpanded}
                watermarkPlacement={isExpanded ? "cartesian" : "compact"}
                exportButtonVariant="text"
                csvContent={netFlowCsv}
                csvFileName={`market-net-flow-${range.toLowerCase()}.csv`}
                imageFileName={`market-net-flow-${range.toLowerCase()}.png`}
              />
            )}
          </AnalyticsChartCard>
        </>
      )}

      {isDelinquencyLoading ? (
        <Skeleton
          variant="rounded"
          height={360}
          sx={{
            bgcolor: COLORS.athensGrey,
            borderRadius: "12px",
            gridColumn: isMobile ? "auto" : "1 / -1",
          }}
        />
      ) : (
        <AnalyticsChartCard
          title={t("lenderMarketDetails.analytics.charts.delinquencyHistory")}
          actions={
            marketStatus ? (
              <MarketStatusChip status={marketStatus} withPeriod={false} />
            ) : undefined
          }
          cardHeight="auto"
          dialogHeight={620}
          cardSx={{ gridColumn: isMobile ? "auto" : "1 / -1", minWidth: 0 }}
        >
          {({ isExpanded }) => (
            <DelinquencyHistoryContent
              data={delinquencyHistory}
              gracePeriodHours={gracePeriodHours}
              isExpanded={isExpanded}
            />
          )}
        </AnalyticsChartCard>
      )}
    </Box>
  )
}
