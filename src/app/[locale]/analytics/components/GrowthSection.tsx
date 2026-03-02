"use client"

import { SectionError } from "./SectionError"
import { SectionSkeleton } from "./SectionSkeleton"
import { StatCard } from "./StatCard"
import { fetchGrowthMetrics } from "../hooks/queries"
import { useSubgraphQuery } from "../hooks/useSubgraphQuery"

export function GrowthSection() {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchGrowthMetrics(),
    "Growth",
    [],
  )
  if (loading)
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
        }}
      >
        {["m1", "m2", "m3", "m4"].map((k) => (
          <SectionSkeleton key={k} height={90} />
        ))}
      </div>
    )
  if (error || !data)
    return <SectionError label="Growth metrics" error={error || "No data"} />
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "12px",
      }}
    >
      <StatCard
        label="New Markets (30d)"
        value={`${data.newMarkets30d}`}
        subtitle="deployed in last 30 days"
      />
      <StatCard
        label="New Lenders (30d)"
        value={`${data.newLenders30d}`}
        subtitle="first deposit in last 30 days"
      />
      <StatCard
        label="Lender Cross-Pollination"
        value={`${data.crossPollination}%`}
        subtitle="lenders active with 2+ borrowers"
      />
      <StatCard
        label="Revenue Concentration"
        value={`${data.revenueConcentration}%`}
        warn={data.revenueConcentration > 80}
        subtitle="top 3 borrowers' share of protocol fees"
      />
    </div>
  )
}
