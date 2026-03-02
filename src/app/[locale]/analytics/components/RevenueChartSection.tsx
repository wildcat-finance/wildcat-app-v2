"use client"

import {
  BarChart,
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

export function RevenueChartSection() {
  const { data, loading, error } = useTimeSeries()
  const { filtered, range, setRange, tickInterval } = useTimeRange(data || [])
  if (loading)
    return (
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
      >
        <SectionSkeleton height={340} label="Loading revenue..." />
        <SectionSkeleton height={340} />
      </div>
    )
  if (error || !data?.length)
    return <SectionError label="Revenue charts" error={error || "No data"} />
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
    >
      <ChartCard
        title="Protocol Fee Revenue"
        description="Daily fees accrued to the protocol"
        height={240}
        timeRange={range}
        onTimeRangeChange={setRange}
      >
        <ResponsiveContainer>
          <BarChart
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
              dataKey="protocolFeesDaily"
              fill={T.accentPurple}
              opacity={0.8}
              name="Protocol Fees"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard
        title="Interest Accrued to Lenders"
        description="Daily base interest + penalty fees earned by lenders"
        height={240}
        timeRange={range}
        onTimeRangeChange={setRange}
      >
        <ResponsiveContainer>
          <BarChart
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
              dataKey="lenderInterestDaily"
              fill={T.accentGreen}
              opacity={0.8}
              name="Lender Interest"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
