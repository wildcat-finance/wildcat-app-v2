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

import { ChartCard } from "./ChartCard"
import { ChartTooltip } from "./ChartTooltip"
import { SectionError } from "./SectionError"
import { SectionSkeleton } from "./SectionSkeleton"
import { T, axisStyle, gridStyle, fmtK } from "../constants"
import { useTimeRange } from "../hooks/useTimeRange"
import { useTimeSeries } from "../hooks/useTimeSeries"

export function FlowsChartSection() {
  const { data, loading, error } = useTimeSeries()
  const { filtered, range, setRange, tickInterval } = useTimeRange(data || [])
  if (loading)
    return (
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
      >
        <SectionSkeleton height={320} label="Loading flows..." />
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
        description="Protocol-wide fund flows — deposits above, withdrawals below"
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
              dataKey="dailyDeposits"
              fill={T.accentGreen}
              opacity={0.8}
              name="Deposits"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="dailyWithdrawalsNeg"
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
        description="Running total: all deposits − all withdrawals protocol-wide"
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
