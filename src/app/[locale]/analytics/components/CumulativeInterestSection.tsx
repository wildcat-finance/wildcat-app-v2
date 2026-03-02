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

export function CumulativeInterestSection() {
  const { data, loading, error } = useTimeSeries()
  const { filtered, range, setRange, tickInterval } = useTimeRange(data || [])
  if (loading)
    return (
      <SectionSkeleton height={360} label="Loading interest breakdown..." />
    )
  if (error || !data?.length)
    return (
      <SectionError label="Interest breakdown" error={error || "No data"} />
    )
  return (
    <ChartCard
      title="Cumulative Interest & Fees"
      description="Base interest (to lenders) + penalty fees (to lenders) + protocol fees — all-time accrual across all markets"
      height={280}
      fullWidth
      timeRange={range}
      onTimeRangeChange={setRange}
    >
      <ResponsiveContainer>
        <AreaChart
          data={filtered}
          margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
        >
          <defs>
            <linearGradient id="hbG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={T.accentGreen} stopOpacity={0.3} />
              <stop offset="95%" stopColor={T.accentGreen} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="hdG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={T.accentAmber} stopOpacity={0.3} />
              <stop offset="95%" stopColor={T.accentAmber} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="hpG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={T.accentPurple} stopOpacity={0.3} />
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
            width={56}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="baseInterest"
            stackId="1"
            stroke={T.accentGreen}
            fill="url(#hbG)"
            name="Base Interest"
          />
          <Area
            type="monotone"
            dataKey="delinquencyFees"
            stackId="1"
            stroke={T.accentAmber}
            fill="url(#hdG)"
            name="Penalty Fees"
          />
          <Area
            type="monotone"
            dataKey="protocolFees"
            stackId="1"
            stroke={T.accentPurple}
            fill="url(#hpG)"
            name="Protocol Fees"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
