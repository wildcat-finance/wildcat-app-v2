"use client"

/* eslint-disable react/no-array-index-key */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts"

import { ChartCard } from "../../components/ChartCard"
import { ChartTooltip } from "../../components/ChartTooltip"
import { SectionError } from "../../components/SectionError"
import { SectionSkeleton } from "../../components/SectionSkeleton"
import { T, fmtK, fmtDateShort, axisStyle, gridStyle } from "../../constants"
import { useSubgraphQuery } from "../../hooks/useSubgraphQuery"
import { useTimeRange } from "../../hooks/useTimeRange"
import { fetchDailyData } from "../hooks/queries"
import type { ParameterChange } from "../types"

export function DebtChartSection({
  addr,
  dec,
  paramChanges,
}: {
  addr: string
  dec: number
  paramChanges: ParameterChange[] | null
}) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchDailyData(addr, dec),
    "DebtChart",
    [addr, dec],
  )
  const { filtered, range, setRange, tickInterval } = useTimeRange(data || [])
  if (loading)
    return <SectionSkeleton height={380} label="Loading daily stats..." />
  if (error || !data?.length)
    return (
      <SectionError label="Debt over time" error={error || "No daily data"} />
    )
  const refLines = (paramChanges || [])
    .map((c) => ({
      dateShort: fmtDateShort(c.timestamp),
      label: c.parameter
        .replace("Annual Interest", "APR")
        .replace("Max Capacity", "Cap ↑"),
    }))
    .filter((r) => filtered.some((d) => d.dateShort === r.dateShort))
  return (
    <ChartCard
      title="Total Debt Over Time"
      description="Market size trajectory · dashed lines mark parameter changes"
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
            <linearGradient id="dG" x1="0" y1="0" x2="0" y2="1">
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
            width={52}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="debt"
            stroke={T.accent}
            strokeWidth={2}
            fill="url(#dG)"
            name="Total Debt"
          />
          {refLines.map((r, i) => (
            <ReferenceLine
              key={i}
              x={r.dateShort}
              stroke={T.accentAmber}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: r.label,
                position: "top",
                fill: T.accentAmber,
                fontSize: 10,
                fontFamily: T.fontMono,
              }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
