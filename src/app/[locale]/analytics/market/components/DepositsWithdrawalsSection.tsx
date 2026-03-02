"use client"

import {
  AreaChart,
  Area,
  ComposedChart,
  Bar,
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
import { T, fmtK, axisStyle, gridStyle } from "../../constants"
import { useSubgraphQuery } from "../../hooks/useSubgraphQuery"
import { useTimeRange } from "../../hooks/useTimeRange"
import { fetchDailyData } from "../hooks/queries"

export function DepositsWithdrawalsSection({
  addr,
  dec,
}: {
  addr: string
  dec: number
}) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchDailyData(addr, dec),
    "DepWd",
    [addr, dec],
  )
  const { filtered, range, setRange, tickInterval } = useTimeRange(data || [])
  if (loading)
    return (
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
      >
        <SectionSkeleton height={320} label="Loading deposits..." />
        <SectionSkeleton height={320} />
      </div>
    )
  if (error || !data?.length)
    return (
      <SectionError label="Deposits & Withdrawals" error={error || "No data"} />
    )
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
    >
      <ChartCard
        title="Daily Deposits & Withdrawals"
        description="Deposits above axis · withdrawals below"
        height={240}
        timeRange={range}
        onTimeRangeChange={setRange}
      >
        <ResponsiveContainer>
          <ComposedChart
            data={filtered}
            margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
          >
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
            <Bar
              dataKey="dailyDeposit"
              fill={T.accentGreen}
              opacity={0.8}
              name="Deposits"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="dailyWithdrawalNeg"
              fill={T.accentRed}
              opacity={0.8}
              name="Withdrawals"
              radius={[0, 0, 2, 2]}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard
        title="Cumulative Net Flow"
        description="Running total: deposits − withdrawals"
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
              <linearGradient id="nfG" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={T.accentGreen}
                  stopOpacity={0.25}
                />
                <stop
                  offset="95%"
                  stopColor={T.accentGreen}
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
              dataKey="netFlow"
              stroke={T.accentGreen}
              strokeWidth={2}
              fill="url(#nfG)"
              name="Net Flow"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
