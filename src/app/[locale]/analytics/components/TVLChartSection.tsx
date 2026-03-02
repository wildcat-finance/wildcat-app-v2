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
import { T, axisStyle, gridStyle, fmtK } from "../constants"
import { useTimeRange } from "../hooks/useTimeRange"
import { useTimeSeries } from "../hooks/useTimeSeries"

export function TVLChartSection() {
  const { data, loading, error } = useTimeSeries()
  const { filtered, range, setRange, tickInterval } = useTimeRange(data || [])
  if (loading)
    return <SectionSkeleton height={360} label="Loading TVL history..." />
  if (error || !data?.length)
    return (
      <SectionError label="TVL over time" error={error || "No daily data"} />
    )
  return (
    <ChartCard
      title="Total Value Locked"
      description="Sum of total debt across all active markets — estimated from net flow when totalDebt field is unavailable"
      height={300}
      fullWidth
      timeRange={range}
      onTimeRangeChange={setRange}
    >
      <ResponsiveContainer>
        <AreaChart
          data={filtered}
          margin={{ top: 10, right: 16, bottom: 0, left: 8 }}
        >
          <defs>
            <linearGradient id="tvlG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={T.accent} stopOpacity={0.3} />
              <stop offset="95%" stopColor={T.accent} stopOpacity={0.02} />
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
            width={56}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="tvl"
            stroke={T.accent}
            strokeWidth={2}
            fill="url(#tvlG)"
            name="TVL"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
