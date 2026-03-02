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
import { T, fmtK, axisStyle, gridStyle, PIE_COLORS } from "../../../constants"
import { useSubgraphQuery } from "../../../hooks/useSubgraphQuery"
import { useTimeRange } from "../../../hooks/useTimeRange"
import { fetchAggregateDebt } from "../hooks/queries"

export function AggregateDebtSection({
  marketIds,
  nameMap,
  priceMap,
}: {
  marketIds: string[]
  nameMap: Record<string, string>
  priceMap: Record<string, number>
}) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchAggregateDebt(marketIds, priceMap),
    "AggDebt",
    [marketIds.join(",")],
  )
  const { filtered, range, setRange, tickInterval } = useTimeRange(data || [])

  if (loading)
    return <SectionSkeleton height={320} label="Loading aggregate debt..." />
  if (error || !data)
    return <SectionError label="Aggregate debt" error={error || "No data"} />
  if (data.length === 0)
    return (
      <div
        style={{
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          padding: "20px 24px",
          fontFamily: T.fontBody,
          fontSize: "13px",
          color: T.textDim,
        }}
      >
        No daily data available yet.
      </div>
    )

  return (
    <ChartCard
      title="Aggregate Debt Over Time"
      description="Total debt across all markets — stacked by market to show relative growth"
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
            {marketIds.map((id, i) => (
              <linearGradient
                key={id}
                id={`aggG${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={PIE_COLORS[i % PIE_COLORS.length]}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={PIE_COLORS[i % PIE_COLORS.length]}
                  stopOpacity={0.02}
                />
              </linearGradient>
            ))}
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
          {marketIds.map((id, i) => (
            <Area
              key={id}
              type="monotone"
              dataKey={id}
              stackId="1"
              stroke={PIE_COLORS[i % PIE_COLORS.length]}
              fill={`url(#aggG${i})`}
              name={nameMap[id] ?? id.slice(0, 10)}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
