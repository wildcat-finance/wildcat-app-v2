"use client"

import * as React from "react"

import {
  Box,
  Chip,
  Link as MuiLink,
  Skeleton,
  Tooltip as MuiTooltip,
  Typography,
} from "@mui/material"
import { GridColDef } from "@mui/x-data-grid"
import Link from "next/link"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

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
  AnalyticsTimeRange,
  filterByTimeRange,
  formatUsd,
} from "@/components/Profile/shared/analytics"
import { AnalyticsChartCard } from "@/components/Profile/shared/AnalyticsChartCard"
import { AnalyticsDataGrid } from "@/components/Profile/shared/AnalyticsDataGrid"
import { AxisStyle, GridStyle } from "@/components/Profile/shared/chartStyle"
import { ChartTooltip } from "@/components/Profile/shared/ChartTooltip"
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

const UsdCell = ({ value }: { value: number | undefined }) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return <>—</>
  return (
    <MuiTooltip
      title={formatUsd(value, { maximumFractionDigits: 2 })}
      placement="top"
    >
      <Box component="span">{formatUsd(value, { compact: true })}</Box>
    </MuiTooltip>
  )
}

const formatAxisUsd = (v: number) => {
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

const CashFlowChart = ({
  data,
  timeRange,
}: {
  data: LenderDailyCashFlowPoint[]
  timeRange: AnalyticsTimeRange
}) => {
  const filtered = filterByTimeRange(data, timeRange)
  const tickInterval = Math.max(1, Math.floor(filtered.length / 12))

  return (
    <ResponsiveContainer>
      <AreaChart
        data={filtered}
        margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
      >
        <CartesianGrid {...GridStyle} />
        <XAxis
          dataKey="dateShort"
          tick={AxisStyle}
          tickLine={false}
          axisLine={false}
          interval={tickInterval}
        />
        <YAxis
          tick={AxisStyle}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatAxisUsd}
          width={72}
        />
        <Tooltip
          content={
            <ChartTooltip
              formatValue={(value) => formatUsd(value, { compact: true })}
            />
          }
        />
        <Legend
          verticalAlign="top"
          align="right"
          height={24}
          iconType="plainline"
          wrapperStyle={{ fontSize: 11, color: COLORS.santasGrey }}
        />
        <Area
          type="monotone"
          dataKey="cumDeposits"
          stroke={DEPOSIT_COLOR}
          strokeWidth={2}
          fill={`${DEPOSIT_COLOR}20`}
          name="Cumulative Deposits"
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="cumWithdrawalsExecuted"
          stroke={WITHDRAWAL_COLOR}
          strokeWidth={2}
          fill={`${WITHDRAWAL_COLOR}20`}
          name="Cumulative Withdrawals"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="netFlowExecuted"
          stroke={NET_FLOW_COLOR}
          strokeWidth={2}
          dot={false}
          name="Net Flow"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export const ActivityCashFlowTab = ({
  lenderAddress,
  positionsData,
  isPositionsLoading,
}: ActivityCashFlowTabProps) => {
  const { getTxUrl } = useBlockExplorer()
  const [timeRange, setTimeRange] = React.useState<AnalyticsTimeRange>("all")

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
          <MuiLink
            component="span"
            underline="hover"
            color={COLORS.ultramarineBlue}
          >
            {value}
          </MuiLink>
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
        <MuiTooltip title={value} placement="top">
          <MuiLink
            href={getTxUrl(value)}
            target="_blank"
            rel="noreferrer"
            underline="hover"
            color={COLORS.ultramarineBlue}
          >
            {trimAddress(value, 8)}
          </MuiLink>
        </MuiTooltip>
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
          <MuiLink
            component="span"
            underline="hover"
            color={COLORS.ultramarineBlue}
          >
            {value}
          </MuiLink>
        </Link>
      ),
    },
    {
      field: "expiry",
      headerName: "Expiry",
      minWidth: 140,
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

  const batchSummary = {
    pending: (batchesQuery.data ?? []).filter(
      (batch) => !batch.isCompleted && !batch.isExpired && !batch.isClosed,
    ).length,
    completed: (batchesQuery.data ?? []).filter((batch) => batch.isCompleted)
      .length,
    totalRequested: (batchesQuery.data ?? []).reduce(
      (sum, batch) => sum + batch.requested,
      0,
    ),
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
          showTimeRange
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          cardHeight={260}
        >
          {() => (
            <CashFlowChart data={dailyStatsQuery.data!} timeRange={timeRange} />
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
        <Typography variant="title3">Deposit & Withdrawal Activity</Typography>
        <Typography
          variant="text4"
          color={COLORS.santasGrey}
          marginTop="6px"
          marginBottom="16px"
          display="block"
          sx={{ lineHeight: 1.45 }}
        >
          Cumulative capital flow and transaction history
        </Typography>

        {renderCashFlow()}

        <Box sx={{ marginTop: "16px" }}>
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
        <Typography variant="title3" marginBottom="12px">
          Withdrawal batch status
        </Typography>

        <LenderAnalyticsSummary
          isLoading={batchesQuery.isLoading}
          items={[
            {
              label: "Pending batches",
              value: String(batchSummary.pending),
            },
            {
              label: "Completed batches",
              value: String(batchSummary.completed),
            },
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

        <Box sx={{ marginTop: "16px" }}>
          <AnalyticsDataGrid
            loading={batchesQuery.isLoading}
            rows={(batchesQuery.data ?? []).map((batch) => ({
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
