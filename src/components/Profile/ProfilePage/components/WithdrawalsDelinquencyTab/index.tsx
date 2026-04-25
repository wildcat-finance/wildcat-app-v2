"use client"

import * as React from "react"

import { Box, Skeleton, Typography } from "@mui/material"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  BorrowerInterestCostPoint,
  BorrowerProfileAnalytics,
} from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import {
  BorrowerAggregateDebtData,
  useBorrowerAggregateDebt,
} from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerAggregateDebt"
import { useBorrowerBatches } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerBatches"
import { useBorrowerDailyStats } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerDailyStats"
import { useBorrowerDelinquencyEvents } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerDelinquencyEvents"
import { LenderAnalyticsSummary } from "@/app/[locale]/lender/market/[address]/components/LenderAnalyticsSummary"
import {
  AnalyticsTimeRange,
  filterByTimeRange,
  formatAxisNumber,
  formatShortDate,
  formatUsd,
  getTimeRangeTicks,
} from "@/components/Profile/shared/analytics"
import { AnalyticsChartCard } from "@/components/Profile/shared/AnalyticsChartCard"
import { AnalyticsUnavailableNotice } from "@/components/Profile/shared/AnalyticsUnavailableNotice"
import {
  AxisStyle,
  CHART_COLORS,
  GridStyle,
} from "@/components/Profile/shared/chartStyle"
import { ChartTooltip } from "@/components/Profile/shared/ChartTooltip"
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

const AggregateDebtChart = ({
  data,
  expanded,
  timeRange,
}: {
  data: BorrowerAggregateDebtData
  expanded: boolean
  timeRange: AnalyticsTimeRange
}) => {
  const filtered = filterByTimeRange(data.points, timeRange)
  const ticks = getTimeRangeTicks(filtered, expanded ? 9 : 6)

  return (
    <ResponsiveContainer>
      <AreaChart
        data={filtered}
        margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
      >
        <CartesianGrid {...GridStyle} />
        <XAxis
          dataKey="timestamp"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          ticks={ticks}
          tick={AxisStyle}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatShortDate}
        />
        <YAxis
          tick={AxisStyle}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${formatAxisNumber(value)}`}
          width={56}
        />
        <Tooltip
          content={
            <ChartTooltip
              formatValue={(value) => formatUsd(value, { compact: true })}
            />
          }
        />
        {data.marketIds.map((marketId, index) => (
          <Area
            key={marketId}
            type="monotone"
            dataKey={marketId}
            stackId="debt"
            stroke="none"
            fill={
              CHART_COLORS.debtSeries[index % CHART_COLORS.debtSeries.length]
            }
            fillOpacity={0.7}
            name={marketId}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

const InterestCostChart = ({
  data,
  expanded,
  timeRange,
}: {
  data: BorrowerInterestCostPoint[]
  expanded: boolean
  timeRange: AnalyticsTimeRange
}) => {
  const filtered = filterByTimeRange(data, timeRange)
  const ticks = getTimeRangeTicks(filtered, expanded ? 9 : 6)

  return (
    <ResponsiveContainer>
      <AreaChart
        data={filtered}
        margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
      >
        <CartesianGrid {...GridStyle} />
        <XAxis
          dataKey="timestamp"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          ticks={ticks}
          tick={AxisStyle}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatShortDate}
        />
        <YAxis
          tick={AxisStyle}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${formatAxisNumber(value)}`}
          width={56}
        />
        <Tooltip
          content={
            <ChartTooltip
              formatValue={(value) => formatUsd(value, { compact: true })}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="baseInterest"
          stackId="interest"
          stroke={CHART_COLORS.baseInterest}
          fill={CHART_COLORS.baseInterest}
          fillOpacity={0.35}
          name="Base interest"
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="delinquencyFees"
          stackId="interest"
          stroke={CHART_COLORS.delinquencyFees}
          fill={CHART_COLORS.delinquencyFees}
          fillOpacity={0.45}
          name="Delinquency fees"
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="protocolFees"
          stackId="interest"
          stroke={CHART_COLORS.protocolFees}
          fill={CHART_COLORS.protocolFees}
          fillOpacity={0.55}
          name="Protocol fees"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export const WithdrawalsDelinquencyTab = ({
  borrowerAddress,
  analytics,
  isAnalyticsLoading,
  analyticsAvailable,
}: WithdrawalsDelinquencyTabProps) => {
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
  const dailyStatsQuery = useBorrowerDailyStats(borrowerAddress)
  const aggregateDebtQuery = useBorrowerAggregateDebt(
    borrowerAddress,
    marketIds,
    analytics?.priceMap ?? {},
    analytics?.nameMap ?? {},
  )

  const [interestRange, setInterestRange] =
    React.useState<AnalyticsTimeRange>("all")
  const [debtRange, setDebtRange] = React.useState<AnalyticsTimeRange>("all")

  const delinquencyMetrics = React.useMemo(() => {
    const events = delinquencyQuery.data ?? []
    const chartDataMap = new Map<
      string,
      {
        name: string
        delinquentHours: number
      }
    >()

    events.forEach((event) => {
      const existing = chartDataMap.get(event.marketId) ?? {
        name: event.marketName,
        delinquentHours: 0,
      }
      existing.delinquentHours += event.durationHours
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
      chartData: Array.from(chartDataMap.values()).sort(
        (left, right) => right.delinquentHours - left.delinquentHours,
      ),
    }
  }, [delinquencyQuery.data])

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
    if (delinquencyMetrics.chartData.length === 0) {
      return (
        <EmptyPanel message="No delinquency events found for this borrower." />
      )
    }

    return (
      <AnalyticsChartCard
        title="Delinquent hours by market"
        description="Aggregated hours spent delinquent across this borrower's markets."
        cardHeight={Math.max(260, delinquencyMetrics.chartData.length * 42)}
        dialogHeight={Math.max(360, delinquencyMetrics.chartData.length * 56)}
      >
        {() => (
          <ResponsiveContainer>
            <BarChart
              data={delinquencyMetrics.chartData}
              layout="vertical"
              margin={{ top: 4, right: 12, bottom: 0, left: 4 }}
            >
              <CartesianGrid {...GridStyle} horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={AxisStyle}
                tickFormatter={formatHours}
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ ...AxisStyle, fill: COLORS.blackRock }}
                width={160}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    headerKey="label"
                    formatValue={(value) => formatHours(value)}
                  />
                }
              />
              <Bar
                dataKey="delinquentHours"
                fill={COLORS.galliano}
                radius={[0, 6, 6, 0]}
                isAnimationActive={false}
                name="Delinquent"
              />
            </BarChart>
          </ResponsiveContainer>
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
        {batchesQuery.data.batches.length === 0 ? (
          <EmptyPanel message="No expired withdrawal batches for this borrower." />
        ) : (
          <AnalyticsChartCard
            title="Batch outcomes"
            description="Requested USD value per expired batch, bucketed by final outcome."
            cardHeight={280}
          >
            {() => (
              <ResponsiveContainer>
                <ComposedChart
                  data={batchesQuery.data!.batches.map((batch) => ({
                    ...batch,
                    subHeader: `Expiry ${formatShortDate(
                      batch.expiryTimestamp,
                    )}`,
                  }))}
                  margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
                >
                  <CartesianGrid {...GridStyle} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={AxisStyle}
                    minTickGap={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={AxisStyle}
                    tickFormatter={(value) => `$${formatAxisNumber(value)}`}
                    width={56}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        headerKey="label"
                        formatValue={(value) =>
                          formatUsd(value, { compact: true })
                        }
                      />
                    }
                  />
                  <Bar
                    dataKey="paid"
                    stackId="a"
                    fill={COLORS.lightGreen}
                    name="Paid"
                  />
                  <Bar
                    dataKey="paidLate"
                    stackId="a"
                    fill={COLORS.oasis}
                    name="Paid late"
                  />
                  <Bar dataKey="unpaid" stackId="a" name="Unpaid">
                    {batchesQuery.data!.batches.map((batch) => (
                      <Cell
                        key={batch.id}
                        fill={
                          batch.status === "unpaid"
                            ? COLORS.carminePink
                            : COLORS.remy
                        }
                      />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
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

  const renderAggregateDebt = () => {
    if (aggregateDebtQuery.isLoading) {
      return (
        <Skeleton
          variant="rounded"
          height={280}
          sx={{ bgcolor: COLORS.athensGrey }}
        />
      )
    }

    if (
      !aggregateDebtQuery.data ||
      aggregateDebtQuery.data.points.length === 0
    ) {
      return <EmptyPanel message="Not enough history to chart debt yet." />
    }

    return (
      <AnalyticsChartCard
        title="Aggregate debt"
        description="Total debt in USD over time, stacked by market."
        showTimeRange
        timeRange={debtRange}
        onTimeRangeChange={setDebtRange}
        cardHeight={260}
      >
        {({ isExpanded }) => (
          <AggregateDebtChart
            data={aggregateDebtQuery.data!}
            expanded={isExpanded}
            timeRange={debtRange}
          />
        )}
      </AnalyticsChartCard>
    )
  }

  const renderInterestCost = () => {
    if (dailyStatsQuery.isLoading) {
      return (
        <Skeleton
          variant="rounded"
          height={280}
          sx={{ bgcolor: COLORS.athensGrey }}
        />
      )
    }

    if (!dailyStatsQuery.data || dailyStatsQuery.data.length === 0) {
      return (
        <EmptyPanel message="No interest costs recorded for this borrower yet." />
      )
    }

    return (
      <AnalyticsChartCard
        title="Cumulative interest cost"
        description="Running total of base interest, delinquency fees, and protocol fees in USD."
        showTimeRange
        timeRange={interestRange}
        onTimeRangeChange={setInterestRange}
        cardHeight={260}
      >
        {({ isExpanded }) => (
          <InterestCostChart
            data={dailyStatsQuery.data!}
            expanded={isExpanded}
            timeRange={interestRange}
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
        title="Borrower debt profile"
        subtitle="Cumulative debt and interest cost over time."
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {renderAggregateDebt()}
          {renderInterestCost()}
        </Box>
      </SectionCard>

      <SectionCard
        title="Withdrawal processing"
        subtitle="Expired batch outcomes and current queue pressure."
      >
        {renderBatches()}
      </SectionCard>
    </Box>
  )
}
