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
import { SectionError } from "./SectionError"
import { SectionSkeleton } from "./SectionSkeleton"
import { T, axisStyle, gridStyle, fmtUSD, fmtK } from "../constants"
import { fetchAllMarkets, computeDistributions } from "../hooks/queries"
import { useSubgraphQuery } from "../hooks/useSubgraphQuery"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DistTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: "#1a2234ee",
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusSm,
        padding: "10px 14px",
        fontFamily: T.fontMono,
        fontSize: "11px",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ color: T.text }}>
        {label}:{" "}
        <span style={{ fontWeight: 600 }}>{fmtUSD(payload[0].value)}</span>
      </div>
    </div>
  )
}

export function DistributionSection() {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchAllMarkets(),
    "Distributions",
    [],
  )
  if (loading)
    return (
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
      >
        <SectionSkeleton height={320} label="Loading APR dist..." />
        <SectionSkeleton height={320} />
      </div>
    )
  if (error || !data)
    return <SectionError label="Distributions" error={error || "No data"} />

  const { aprDist, utilDist } = computeDistributions(data.markets)

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
    >
      <ChartCard
        title="APR Distribution"
        description="TVL by base APR range across active markets"
        height={200}
      >
        <ResponsiveContainer>
          <BarChart
            data={aprDist}
            margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
          >
            <CartesianGrid {...gridStyle} />
            <XAxis
              dataKey="range"
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={fmtK}
            />
            <Tooltip content={<DistTooltip />} />
            <Bar
              dataKey="count"
              fill={T.accent}
              opacity={0.75}
              name="TVL"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard
        title="Capacity Utilization Distribution"
        description="TVL by utilization range across active markets"
        height={200}
      >
        <ResponsiveContainer>
          <BarChart
            data={utilDist}
            margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
          >
            <CartesianGrid {...gridStyle} />
            <XAxis
              dataKey="range"
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={fmtK}
            />
            <Tooltip content={<DistTooltip />} />
            <Bar
              dataKey="count"
              fill={T.accentGreen}
              opacity={0.75}
              name="TVL"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
