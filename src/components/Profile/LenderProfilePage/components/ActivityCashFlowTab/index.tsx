"use client"

import * as React from "react"

import {
  Box,
  Chip,
  Skeleton,
  Tooltip as MuiTooltip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material"
import { GridColDef } from "@mui/x-data-grid"
import Link from "next/link"

import { LenderAnalyticsSummary } from "@/app/[locale]/lender/market/[address]/components/LenderAnalyticsSummary"
import {
  LenderBatchRow,
  LenderPositionsData,
} from "@/app/[locale]/lender/profile/hooks/types"
import { useLenderActivity } from "@/app/[locale]/lender/profile/hooks/useLenderActivity"
import { useLenderBatches } from "@/app/[locale]/lender/profile/hooks/useLenderBatches"
import {
  LenderDailyCashFlowPoint,
  useLenderDailyStats,
} from "@/app/[locale]/lender/profile/hooks/useLenderDailyStats"
import {
  ChartTooltipFormatter,
  TimeSeriesChart,
  TimeSeriesConfig,
  formatChartDate,
} from "@/components/ECharts"
import { tooltipRow, tooltipShell } from "@/components/ECharts/formatters"
import { LinkGroup } from "@/components/LinkComponent"
import { formatUsd } from "@/components/Profile/shared/analytics"
import { AnalyticsChartCard } from "@/components/Profile/shared/AnalyticsChartCard"
import { AnalyticsDataGrid } from "@/components/Profile/shared/AnalyticsDataGrid"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { buildMarketHref, trimAddress } from "@/utils/formatters"

type ActivityCashFlowTabProps = {
  lenderAddress: `0x${string}` | undefined
  positionsData?: LenderPositionsData
  isPositionsLoading: boolean
}

const getBatchStatus = (batch: LenderBatchRow) => {
  if (batch.isCompleted) {
    return {
      label: "Completed",
      color: COLORS.lightGreen,
      textColor: COLORS.blackRock,
    }
  }
  if (batch.isExpired) {
    return {
      label: "Expired",
      color: COLORS.remy,
      textColor: COLORS.dullRed,
    }
  }
  if (batch.isClosed) {
    return {
      label: "Closed",
      color: COLORS.athensGrey,
      textColor: COLORS.santasGrey,
    }
  }
  return {
    label: "Pending",
    color: COLORS.oasis,
    textColor: COLORS.butteredRum,
  }
}

const getActivityTypePalette = (value: string) => {
  if (value === "Deposit") {
    return {
      backgroundColor: COLORS.lightGreen,
      color: COLORS.blackRock,
    }
  }

  if (value === "Withdrawal Request") {
    return {
      backgroundColor: COLORS.oasis,
      color: COLORS.butteredRum,
    }
  }

  return {
    backgroundColor: COLORS.remy,
    color: COLORS.dullRed,
  }
}

const DEPOSIT_COLOR = "#34d399"
const WITHDRAWAL_COLOR = "#f87171"
const NET_FLOW_COLOR = "#22d3ee"

type CashFlowPeriod = "D" | "W" | "M" | "Q" | "Y" | "Cumulative"

type CashFlowChartPoint = LenderDailyCashFlowPoint & {
  periodDeposits: number
  periodWithdrawalsRequested: number
  periodWithdrawalsExecuted: number
  periodInterestEarned: number
}

const CASH_FLOW_PERIODS: CashFlowPeriod[] = [
  "D",
  "W",
  "M",
  "Q",
  "Y",
  "Cumulative",
]

const CASH_FLOW_SERIES: TimeSeriesConfig<CashFlowChartPoint>[] = [
  {
    key: "cumDeposits",
    name: "Cumulative Deposits",
    color: DEPOSIT_COLOR,
    kind: "area",
  },
  {
    key: "cumWithdrawalsExecuted",
    name: "Cumulative Withdrawals",
    color: WITHDRAWAL_COLOR,
    kind: "area",
  },
  {
    key: "netFlowExecuted",
    name: "Net Flow",
    color: NET_FLOW_COLOR,
    kind: "line",
  },
]

const getUtcDate = (timestamp: number) => new Date(timestamp * 1000)

const getPeriodStartTimestamp = (
  timestamp: number,
  period: Exclude<CashFlowPeriod, "D" | "Cumulative">,
) => {
  const date = getUtcDate(timestamp)
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()

  if (period === "W") {
    const start = new Date(
      Date.UTC(year, month, date.getUTCDate() - ((date.getUTCDay() + 6) % 7)),
    )
    return Math.floor(start.getTime() / 1000)
  }

  if (period === "M") return Math.floor(Date.UTC(year, month, 1) / 1000)
  if (period === "Q")
    return Math.floor(Date.UTC(year, month - (month % 3), 1) / 1000)
  return Math.floor(Date.UTC(year, 0, 1) / 1000)
}

const getCashFlowPointWithPeriodValues = (
  point: LenderDailyCashFlowPoint,
): CashFlowChartPoint => ({
  ...point,
  periodDeposits: point.dayDeposits,
  periodWithdrawalsRequested: point.dayWithdrawalsRequested,
  periodWithdrawalsExecuted: point.dayWithdrawalsExecuted,
  periodInterestEarned: point.dayInterestEarned,
})

const groupCashFlowData = (
  data: LenderDailyCashFlowPoint[],
  period: CashFlowPeriod,
): CashFlowChartPoint[] => {
  if (period === "D" || period === "Cumulative") {
    return data.map(getCashFlowPointWithPeriodValues)
  }

  const grouped = new Map<number, CashFlowChartPoint>()

  data.forEach((point) => {
    const timestamp = getPeriodStartTimestamp(point.timestamp, period)
    const existing = grouped.get(timestamp)

    if (!existing) {
      grouped.set(timestamp, {
        ...point,
        timestamp,
        date: formatChartDate(timestamp * 1000),
        dateShort: formatChartDate(timestamp * 1000),
        periodDeposits: point.dayDeposits,
        periodWithdrawalsRequested: point.dayWithdrawalsRequested,
        periodWithdrawalsExecuted: point.dayWithdrawalsExecuted,
        periodInterestEarned: point.dayInterestEarned,
      })
      return
    }

    existing.periodDeposits += point.dayDeposits
    existing.periodWithdrawalsRequested += point.dayWithdrawalsRequested
    existing.periodWithdrawalsExecuted += point.dayWithdrawalsExecuted
    existing.periodInterestEarned += point.dayInterestEarned
    existing.cumDeposits = point.cumDeposits
    existing.cumWithdrawalsRequested = point.cumWithdrawalsRequested
    existing.cumWithdrawalsExecuted = point.cumWithdrawalsExecuted
    existing.cumInterestEarned = point.cumInterestEarned
    existing.netFlowExecuted = point.netFlowExecuted
    existing.netFlowRequested = point.netFlowRequested
    existing.pendingBand = point.pendingBand
  })

  return Array.from(grouped.values()).sort(
    (left, right) => left.timestamp - right.timestamp,
  )
}

const buildCashFlowCsv = (data: CashFlowChartPoint[]) =>
  [
    [
      "Date",
      "Deposits",
      "Withdrawals Requested",
      "Withdrawals Executed",
      "Interest Earned",
      "Cumulative Deposits",
      "Cumulative Withdrawals",
      "Net Flow",
      "Total Movement",
    ],
    ...data.map((point) => [
      formatChartDate(point.timestamp * 1000),
      point.periodDeposits,
      point.periodWithdrawalsRequested,
      point.periodWithdrawalsExecuted,
      point.periodInterestEarned,
      point.cumDeposits,
      point.cumWithdrawalsExecuted,
      point.netFlowExecuted,
      point.periodDeposits + point.periodWithdrawalsExecuted,
    ]),
  ]
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n")

const getCashFlowTooltip =
  (period: CashFlowPeriod): ChartTooltipFormatter<CashFlowChartPoint> =>
  (params, data) => {
    const items = Array.isArray(params) ? params : [params]
    const timestamp = Number(items[0]?.axisValue ?? 0) / 1000
    const point = data.find((item) => item.timestamp === timestamp)
    if (!point) return ""

    const periodLabel = period === "Cumulative" ? "Daily" : period
    const rows = [
      tooltipRow({
        color: DEPOSIT_COLOR,
        label: `${periodLabel} deposits`,
        value: formatUsd(point.periodDeposits, { compact: true }),
      }),
      tooltipRow({
        color: WITHDRAWAL_COLOR,
        label: `${periodLabel} withdrawals`,
        value: formatUsd(point.periodWithdrawalsExecuted, { compact: true }),
      }),
      tooltipRow({
        color: COLORS.galliano,
        label: "Requested withdrawals",
        value: formatUsd(point.periodWithdrawalsRequested, { compact: true }),
      }),
      tooltipRow({
        color: DEPOSIT_COLOR,
        label: "Cumulative deposits",
        value: formatUsd(point.cumDeposits, { compact: true }),
      }),
      tooltipRow({
        color: WITHDRAWAL_COLOR,
        label: "Cumulative withdrawals",
        value: formatUsd(point.cumWithdrawalsExecuted, { compact: true }),
      }),
      tooltipRow({
        color: NET_FLOW_COLOR,
        label: "Net flow",
        value: formatUsd(point.netFlowExecuted, { compact: true }),
      }),
      tooltipRow({
        color: COLORS.santasGrey,
        label: "Total movement",
        value: formatUsd(
          point.periodDeposits + point.periodWithdrawalsExecuted,
          {
            compact: true,
          },
        ),
      }),
    ].join("")

    return tooltipShell(formatChartDate(point.timestamp * 1000), rows)
  }

const UsdCell = ({ value }: { value: number | undefined }) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return <Typography variant="text3">—</Typography>
  }
  return (
    <MuiTooltip
      title={formatUsd(value, { maximumFractionDigits: 2 })}
      placement="top"
    >
      <Typography component="span" variant="text3">
        {formatUsd(value, { compact: true })}
      </Typography>
    </MuiTooltip>
  )
}

const TextCell = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="text3">{children}</Typography>
)

const formatAxisUsd = (v: number) => {
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

const PeriodSelector = ({
  value,
  onChange,
}: {
  value: CashFlowPeriod
  onChange: (value: CashFlowPeriod) => void
}) => (
  <ToggleButtonGroup
    exclusive
    size="small"
    value={value}
    onChange={(_, nextValue: CashFlowPeriod | null) => {
      if (nextValue) onChange(nextValue)
    }}
    sx={{
      "& .MuiToggleButton-root": {
        borderColor: COLORS.athensGrey,
        color: COLORS.santasGrey,
        fontFamily: "inherit",
        fontSize: 10,
        lineHeight: 1,
        minWidth: 30,
        padding: "5px 7px",
        textTransform: "none",
      },
      "& .Mui-selected": {
        backgroundColor: `${COLORS.ultramarineBlue}14 !important`,
        color: `${COLORS.ultramarineBlue} !important`,
      },
    }}
  >
    {CASH_FLOW_PERIODS.map((period) => (
      <ToggleButton
        key={period}
        value={period}
        aria-label={`${period} grouping`}
      >
        {period}
      </ToggleButton>
    ))}
  </ToggleButtonGroup>
)

const CashFlowChart = ({
  data,
  period,
}: {
  data: LenderDailyCashFlowPoint[]
  period: CashFlowPeriod
}) => {
  const groupedData = React.useMemo(
    () => groupCashFlowData(data, period),
    [data, period],
  )

  return (
    <TimeSeriesChart
      data={groupedData}
      series={CASH_FLOW_SERIES}
      formatValue={(value) => formatUsd(value, { compact: true })}
      yAxisFormatter={formatAxisUsd}
      tooltipFormatter={getCashFlowTooltip(period)}
      showExportActions
      exportButtonVariant="text"
      csvContent={buildCashFlowCsv(groupedData)}
      csvFileName={`lender-cashflow-${period.toLowerCase()}.csv`}
      imageFileName={`lender-cashflow-${period.toLowerCase()}.png`}
      ariaLabel="Cumulative lender capital flow"
    />
  )
}

export const ActivityCashFlowTab = ({
  lenderAddress,
  positionsData,
  isPositionsLoading,
}: ActivityCashFlowTabProps) => {
  const { getTxUrl } = useBlockExplorer()
  const [cashFlowPeriod, setCashFlowPeriod] =
    React.useState<CashFlowPeriod>("Cumulative")

  const activityQuery = useLenderActivity(
    lenderAddress,
    positionsData?.marketIds ?? [],
    positionsData?.decimalsMap ?? {},
    positionsData?.priceMap ?? {},
  )
  const batchesQuery = useLenderBatches(
    lenderAddress,
    positionsData?.marketIds ?? [],
    positionsData?.priceMap ?? {},
  )
  const dailyStatsQuery = useLenderDailyStats(lenderAddress)

  const activityColumns: GridColDef[] = [
    {
      field: "date",
      headerName: "Date",
      minWidth: 130,
      renderCell: ({ value }) => <TextCell>{value}</TextCell>,
    },
    {
      field: "market",
      headerName: "Market",
      flex: 1.2,
      minWidth: 220,
      renderCell: ({ row, value }) => (
        <Link
          href={buildMarketHref(row.marketId, undefined, ROUTES.lender.market)}
        >
          <Typography component="span" variant="text3">
            {value}
          </Typography>
        </Link>
      ),
    },
    {
      field: "type",
      headerName: "Type",
      minWidth: 180,
      renderCell: ({ value }) => {
        const palette = getActivityTypePalette(value as string)

        return (
          <Chip
            label={value}
            size="small"
            sx={{
              borderRadius: "8px",
              ...palette,
            }}
          />
        )
      },
    },
    {
      field: "amountUsd",
      headerName: "Amount",
      minWidth: 130,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => <UsdCell value={value as number} />,
    },
    {
      field: "txHash",
      headerName: "Transaction",
      minWidth: 170,
      renderCell: ({ value }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <MuiTooltip title={value} placement="top">
            <Typography component="span" variant="text3">
              {trimAddress(value, 8)}
            </Typography>
          </MuiTooltip>
          <LinkGroup linkValue={getTxUrl(value)} copyValue={value} />
        </Box>
      ),
    },
  ]

  const batchColumns: GridColDef[] = [
    {
      field: "marketName",
      headerName: "Market",
      flex: 1.1,
      minWidth: 220,
      renderCell: ({ row, value }) => (
        <Link
          href={buildMarketHref(row.marketId, undefined, ROUTES.lender.market)}
        >
          <Typography component="span" variant="text3">
            {value}
          </Typography>
        </Link>
      ),
    },
    {
      field: "expiry",
      headerName: "Expiry",
      minWidth: 140,
      renderCell: ({ value }) => <TextCell>{value}</TextCell>,
    },
    {
      field: "requested",
      headerName: "Requested",
      minWidth: 130,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => <UsdCell value={value as number} />,
    },
    {
      field: "withdrawn",
      headerName: "Withdrawn",
      minWidth: 130,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => <UsdCell value={value as number} />,
    },
    {
      field: "remaining",
      headerName: "Remaining",
      minWidth: 130,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => <UsdCell value={value as number} />,
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 130,
      sortable: false,
      renderCell: ({ row }) => {
        const status = getBatchStatus(row as LenderBatchRow)
        return (
          <Chip
            label={status.label}
            size="small"
            sx={{
              borderRadius: "8px",
              backgroundColor: status.color,
              color: status.textColor,
            }}
          />
        )
      },
    },
  ]

  const batchRows = batchesQuery.data ?? []
  const batchSummary = {
    total: batchRows.length,
    pending: batchRows.filter(
      (batch) => getBatchStatus(batch).label === "Pending",
    ).length,
    completed: batchRows.filter(
      (batch) => getBatchStatus(batch).label === "Completed",
    ).length,
    expired: batchRows.filter(
      (batch) => getBatchStatus(batch).label === "Expired",
    ).length,
    closed: batchRows.filter(
      (batch) => getBatchStatus(batch).label === "Closed",
    ).length,
    totalRequested: batchRows.reduce((sum, batch) => sum + batch.requested, 0),
  }

  const hasCashFlow = (dailyStatsQuery.data?.length ?? 0) > 1
  const cashFlowFailed = dailyStatsQuery.isError
  const cashFlowLoading = dailyStatsQuery.isLoading || dailyStatsQuery.isPending

  const renderCashFlow = () => {
    if (cashFlowFailed) {
      return (
        <Box
          sx={{
            border: `1px solid ${COLORS.remy}`,
            backgroundColor: COLORS.remy,
            borderRadius: "16px",
            padding: "24px",
          }}
        >
          <Typography variant="text2" color={COLORS.dullRed}>
            Failed to load cash flow analytics.
          </Typography>
        </Box>
      )
    }

    if (cashFlowLoading) {
      return (
        <Skeleton
          variant="rectangular"
          sx={{ height: "260px", borderRadius: "16px" }}
        />
      )
    }

    if (hasCashFlow) {
      return (
        <AnalyticsChartCard
          title="Cumulative Capital Flow"
          description="Cumulative deposits vs withdrawals over time (USD)"
          actions={
            <PeriodSelector
              value={cashFlowPeriod}
              onChange={setCashFlowPeriod}
            />
          }
          cardHeight={260}
          constrainWidth
        >
          {() => (
            <CashFlowChart
              data={dailyStatsQuery.data!}
              period={cashFlowPeriod}
            />
          )}
        </AnalyticsChartCard>
      )
    }

    return (
      <Box
        sx={{
          border: `1px dashed ${COLORS.iron}`,
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <Typography variant="text2" color={COLORS.santasGrey}>
          Not enough historical activity to chart cash flow yet.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <Box>
        <Typography
          variant="title2"
          display="block"
          sx={{ marginBottom: "6px" }}
        >
          Deposit & Withdrawal Activity
        </Typography>
        <Typography
          variant="text3"
          color={COLORS.santasGrey}
          display="block"
          sx={{ marginBottom: "24px" }}
        >
          Cumulative capital flow and transaction history
        </Typography>

        {renderCashFlow()}

        <Box sx={{ marginTop: "24px" }}>
          <AnalyticsDataGrid
            loading={isPositionsLoading || activityQuery.isLoading}
            rows={activityQuery.data?.activity ?? []}
            columns={activityColumns}
            noRowsLabel="No deposit or withdrawal activity found."
            minWidth={920}
          />
        </Box>
      </Box>

      <Box>
        <Typography
          variant="title2"
          display="block"
          sx={{ marginBottom: "24px" }}
        >
          Withdrawal batch status
        </Typography>

        <LenderAnalyticsSummary
          isLoading={batchesQuery.isLoading}
          items={[
            {
              label: "Total batches",
              value: String(batchSummary.total),
              description: "rows in the table",
            },
            {
              label: "Pending batches",
              value: String(batchSummary.pending),
            },
            {
              label: "Completed batches",
              value: String(batchSummary.completed),
            },
            {
              label: "Expired batches",
              value: String(batchSummary.expired),
            },
            ...(batchSummary.closed > 0
              ? [
                  {
                    label: "Closed batches",
                    value: String(batchSummary.closed),
                  },
                ]
              : []),
            {
              label: "Total requested",
              value: formatUsd(batchSummary.totalRequested, {
                compact: true,
              }),
              fullPrecisionValue: formatUsd(batchSummary.totalRequested, {
                maximumFractionDigits: 2,
              }),
            },
          ]}
        />

        <Box sx={{ marginTop: "24px" }}>
          <AnalyticsDataGrid
            loading={batchesQuery.isLoading}
            rows={batchRows.map((batch) => ({
              ...batch,
              status: getBatchStatus(batch).label,
            }))}
            columns={batchColumns}
            noRowsLabel="No withdrawal batches found."
            minWidth={900}
          />
        </Box>
      </Box>
    </Box>
  )
}
