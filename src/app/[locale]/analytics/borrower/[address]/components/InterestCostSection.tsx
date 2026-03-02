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

import { ChartCard } from "../../../components/ChartCard"
import { ChartTooltip } from "../../../components/ChartTooltip"
import { SectionError } from "../../../components/SectionError"
import { SectionSkeleton } from "../../../components/SectionSkeleton"
import { StatCard } from "../../../components/StatCard"
import { T, fmtUSD, fmtK, axisStyle, gridStyle } from "../../../constants"
import { useSubgraphQuery } from "../../../hooks/useSubgraphQuery"
import { useTimeRange } from "../../../hooks/useTimeRange"
import { fetchBorrowerInterest } from "../hooks/queries"
import type { BorrowerProfile } from "../types"

export function InterestCostSection({
  marketIds,
  priceMap,
  profile,
}: {
  marketIds: string[]
  priceMap: Record<string, number>
  profile: BorrowerProfile
}) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchBorrowerInterest(marketIds, priceMap, profile),
    "BorrowerInterest",
    [marketIds.join(",")],
  )
  const { filtered, range, setRange, tickInterval } = useTimeRange(
    data?.points || [],
  )

  if (loading)
    return <SectionSkeleton height={320} label="Loading interest data..." />
  if (error || !data)
    return (
      <SectionError label="Interest breakdown" error={error || "No data"} />
    )

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: "12px",
      }}
    >
      <ChartCard
        title="Cumulative Borrower Cost"
        description="Base interest + penalty fees + protocol fees — total cost of capital over time"
        height={240}
        timeRange={range}
        onTimeRangeChange={setRange}
      >
        {data.points.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              fontFamily: T.fontBody,
              fontSize: "13px",
              color: T.textDim,
            }}
          >
            No interest data yet
          </div>
        ) : (
          <ResponsiveContainer>
            <AreaChart
              data={filtered}
              margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
            >
              <defs>
                <linearGradient id="bwrBG" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={T.accentGreen}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={T.accentGreen}
                    stopOpacity={0.02}
                  />
                </linearGradient>
                <linearGradient id="bwrDG" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={T.accentAmber}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={T.accentAmber}
                    stopOpacity={0.02}
                  />
                </linearGradient>
                <linearGradient id="bwrPG" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#bwrBG)"
                name="Base Interest"
              />
              <Area
                type="monotone"
                dataKey="delinquencyFees"
                stackId="1"
                stroke={T.accentAmber}
                fill="url(#bwrDG)"
                name="Penalty Fees"
              />
              <Area
                type="monotone"
                dataKey="protocolFees"
                stackId="1"
                stroke={T.accentPurple}
                fill="url(#bwrPG)"
                name="Protocol Fees"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
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
          label="Total Cost"
          value={fmtUSD(data.totalCost)}
          accent
          subtitle="all-time interest + fees"
        />
        <StatCard
          small
          label="Annualized Cost"
          value={data.annualizedCost}
          subtitle="as % of avg debt"
        />
        <StatCard
          small
          label="Penalty Fee Ratio"
          value={data.penaltyRatio}
          warn
          subtitle="penalty fees / total cost"
        />
        <StatCard
          small
          label="Protocol Fees Paid"
          value={fmtUSD(data.totalProtocolFees)}
          subtitle="revenue to Wildcat"
        />
      </div>
    </div>
  )
}
