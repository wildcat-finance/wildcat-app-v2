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
  BorrowerWithdrawalBatchSummary,
  BorrowerProfileAnalytics,
} from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { useBorrowerBatches } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerBatches"
import { useBorrowerDelinquencyEvents } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerDelinquencyEvents"
import { LenderAnalyticsSummary } from "@/app/[locale]/lender/market/[address]/components/LenderAnalyticsSummary"
import {
  CHART_PALETTE,
  CategoryBarChart,
  CategoryBarSeries,
  ChartTooltipFormatter,
  formatChartDate,
} from "@/components/ECharts"
import { tooltipRow, tooltipShell } from "@/components/ECharts/formatters"
import {
  formatShortDate,
  formatUsd,
} from "@/components/Profile/shared/analytics"
import { AnalyticsChartCard } from "@/components/Profile/shared/AnalyticsChartCard"
import {
  AnalyticsSectionCard,
  EmptyPanel,
} from "@/components/Profile/shared/AnalyticsPanels"
import { AnalyticsUnavailableNotice } from "@/components/Profile/shared/AnalyticsUnavailableNotice"
import { buildCsv } from "@/components/Profile/shared/chartExport"
import { COLORS } from "@/theme/colors"

type WithdrawalsDelinquencyTabProps = {
  borrowerAddress: `0x${string}` | undefined
  analytics?: BorrowerProfileAnalytics
  isAnalyticsLoading: boolean
  analyticsAvailable: boolean
}

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
    color: CHART_PALETTE.semantic.warning,
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

const BATCH_PAID_COLOR = CHART_PALETTE.batch.paid
const BATCH_PAID_LATE_COLOR = CHART_PALETTE.batch.paidLate
const BATCH_UNPAID_COLOR = CHART_PALETTE.batch.unpaid
const getDelinquencyChartHeight = (rowCount: number) =>
  Math.min(520, Math.max(260, rowCount * 28))

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
      batch.status === "unpaid"
        ? CHART_PALETTE.batch.shortfall
        : BATCH_UNPAID_COLOR,
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
        backgroundColor: `${CHART_PALETTE.semantic.primary}14 !important`,
        color: `${CHART_PALETTE.semantic.primary} !important`,
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
        color: CHART_PALETTE.semantic.warning,
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
            row.status === "unpaid"
              ? CHART_PALETTE.batch.shortfall
              : BATCH_UNPAID_COLOR,
          label: mode === "percent" ? "Unpaid %" : "Unpaid",
          value:
            mode === "percent"
              ? `${row.chartUnpaid.toFixed(1)}%`
              : formatUsd(row.unpaid, { compact: true }),
        }),
        tooltipRow({
          color: CHART_PALETTE.batch.shortfall,
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
        description="Markets ranked by total time spent delinquent."
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
        cardHeight={getDelinquencyChartHeight(delinquencyRows.length)}
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
                color: [
                  CHART_PALETTE.risk.healthy,
                  CHART_PALETTE.semantic.warning,
                  CHART_PALETTE.semantic.danger,
                ],
              },
            }}
            yAxisWidth={170}
            barBorderRadius={0}
            categoryLabelFontFamily="Inter, sans-serif"
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
            description="Expired withdrawal batches split by paid, late-paid, and unpaid value."
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
                barBorderRadius={0}
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
                  color: CHART_PALETTE.semantic.primary,
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <AnalyticsSectionCard
        title="Delinquency track record"
        subtitle="How often markets fell delinquent and how long they took to recover."
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
      </AnalyticsSectionCard>

      <AnalyticsSectionCard
        title="Withdrawal processing"
        subtitle="Expired batch outcomes and current withdrawal queue."
      >
        {renderBatches()}
      </AnalyticsSectionCard>
    </Box>
  )
}
