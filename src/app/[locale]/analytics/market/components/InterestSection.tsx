"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

import { ChartCard } from "../../components/ChartCard"
import { ChartTooltip } from "../../components/ChartTooltip"
import { SectionError } from "../../components/SectionError"
import { SectionSkeleton } from "../../components/SectionSkeleton"
import { StatCard } from "../../components/StatCard"
import { T, fmtUSD, fmtK, axisStyle, gridStyle } from "../../constants"
import { useSubgraphQuery } from "../../hooks/useSubgraphQuery"
import { useTimeRange } from "../../hooks/useTimeRange"
import { fetchDailyData } from "../hooks/queries"
import type { MarketInfo } from "../types"

export function InterestSection({
  addr,
  dec,
  market,
}: {
  addr: string
  dec: number
  market: MarketInfo | null
}) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchDailyData(addr, dec),
    "Interest",
    [addr, dec],
  )
  const { filtered, range, setRange, tickInterval } = useTimeRange(data || [])
  if (loading || !market)
    return <SectionSkeleton height={320} label="Loading interest data..." />
  if (error || !data?.length)
    return (
      <SectionError label="Interest breakdown" error={error || "No data"} />
    )
  const totalCost =
    market.totalBaseInterest +
    market.totalDelinquencyFees +
    market.totalProtocolFees
  const ageYears =
    (Date.now() - market.createdAt.getTime()) / (365.25 * 86400 * 1000)
  const effectiveCost =
    ageYears > 0 && market.totalDebt > 0
      ? `${((totalCost / ageYears / market.totalDebt) * 100).toFixed(2)}%`
      : "—"
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}
    >
      <ChartCard
        title="Cumulative Interest Breakdown"
        description="Base interest + penalty fees (to lenders) + protocol fees"
        height={240}
        timeRange={range}
        onTimeRangeChange={setRange}
      >
        <ResponsiveContainer>
          <AreaChart
            data={filtered}
            margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
          >
            <defs>
              <linearGradient id="bG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={T.accentGreen} stopOpacity={0.3} />
                <stop
                  offset="95%"
                  stopColor={T.accentGreen}
                  stopOpacity={0.02}
                />
              </linearGradient>
              <linearGradient id="dlG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={T.accentAmber} stopOpacity={0.3} />
                <stop
                  offset="95%"
                  stopColor={T.accentAmber}
                  stopOpacity={0.02}
                />
              </linearGradient>
              <linearGradient id="pG" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={T.accentPurple}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={T.accentPurple}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridStyle} />
            <XAxis
              dataKey="dateShort"
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtK}
              width={48}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="baseInterest"
              stackId="1"
              stroke={T.accentGreen}
              fill="url(#bG)"
              name="Base Interest"
            />
            <Area
              type="monotone"
              dataKey="delinquencyFees"
              stackId="1"
              stroke={T.accentAmber}
              fill="url(#dlG)"
              name="Penalty Fees"
            />
            <Area
              type="monotone"
              dataKey="protocolFees"
              stackId="1"
              stroke={T.accentPurple}
              fill="url(#pG)"
              name="Protocol Fees"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
      <div
        style={{
          display: "grid",
          gridTemplateRows: "1fr 1fr 1fr 1fr",
          gap: "8px",
        }}
      >
        <StatCard
          small
          label="Interest to Lenders"
          value={fmtUSD(market.totalBaseInterest)}
          subtitle="base interest"
        />
        <StatCard
          small
          label="Total Penalty Fees"
          value={fmtUSD(market.totalDelinquencyFees)}
          warn
          subtitle="delinquency fees to lenders"
        />
        <StatCard
          small
          label="Protocol Fees"
          value={fmtUSD(market.totalProtocolFees)}
          subtitle="total accrued"
        />
        <StatCard
          small
          label="Effective Borrower Cost"
          value={effectiveCost}
          accent
          subtitle="annualized, all-in"
        />
      </div>
    </div>
  )
}
