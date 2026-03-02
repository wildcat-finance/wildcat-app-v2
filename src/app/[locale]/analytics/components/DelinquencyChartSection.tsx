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

import { ChartCard } from "./ChartCard"
import { ChartTooltip } from "./ChartTooltip"
import { SectionError } from "./SectionError"
import { SectionSkeleton } from "./SectionSkeleton"
import { T, axisStyle, gridStyle } from "../constants"
import { useProgressiveDelinquency } from "../hooks/useProgressiveDelinquency"
import { useTimeRange } from "../hooks/useTimeRange"

export function DelinquencyChartSection() {
  const { data, loading, error } = useProgressiveDelinquency()
  const { filtered, range, setRange, tickInterval } = useTimeRange(data || [])
  if (loading)
    return (
      <SectionSkeleton height={320} label="Loading delinquency timeline..." />
    )
  if (error || !data?.length)
    return (
      <SectionError
        label="Delinquent markets"
        error={error || "No delinquency events"}
      />
    )
  return (
    <ChartCard
      title="Delinquent Markets Over Time"
      description="Count of markets in delinquent state on each day — derived from DelinquencyStatusChanged events"
      height={220}
      timeRange={range}
      onTimeRangeChange={setRange}
    >
      <ResponsiveContainer>
        <AreaChart
          data={filtered}
          margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
        >
          <defs>
            <linearGradient id="dlqG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={T.accentAmber} stopOpacity={0.35} />
              <stop offset="95%" stopColor={T.accentAmber} stopOpacity={0.02} />
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
            width={32}
            allowDecimals={false}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="stepAfter"
            dataKey="delinquentCount"
            stroke={T.accentAmber}
            strokeWidth={2}
            fill="url(#dlqG)"
            name="Delinquent Markets"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
