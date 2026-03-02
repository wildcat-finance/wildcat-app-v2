"use client"

import { CompositionPie } from "./CompositionPie"
import { SectionError } from "./SectionError"
import { SectionSkeleton } from "./SectionSkeleton"
import { StatCard } from "./StatCard"
import { fmtUSD } from "../constants"
import { fetchAllMarkets } from "../hooks/queries"
import { useSubgraphQuery } from "../hooks/useSubgraphQuery"

export function ProtocolHeaderSection() {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchAllMarkets(),
    "ProtocolHeader",
    [],
  )

  if (loading)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "12px",
          }}
        >
          {["s1", "s2", "s3", "s4", "s5", "s6"].map((k) => (
            <SectionSkeleton key={k} height={90} />
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <SectionSkeleton height={300} label="Loading TVL composition..." />
          <SectionSkeleton height={300} />
        </div>
      </div>
    )
  if (error || !data)
    return <SectionError label="Protocol overview" error={error || "No data"} />

  const s = data.stats
  const statusSub = [
    s.healthyMarkets > 0 ? `${s.healthyMarkets} healthy` : null,
    s.delinquentMarkets > 0 ? `${s.delinquentMarkets} delinquent` : null,
    s.penaltyMarkets > 0 ? `${s.penaltyMarkets} penalty` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
        }}
      >
        <StatCard
          label="Total Value Locked"
          value={fmtUSD(s.tvl)}
          accent
          subtitle="across all active markets"
        />
        <StatCard
          label="Active Markets"
          value={`${s.activeMarkets}`}
          subtitle={statusSub || "all healthy"}
          warn={s.delinquentMarkets + s.penaltyMarkets > 0}
        />
        <StatCard label="Total Borrowers" value={`${s.totalBorrowers}`} />
        <StatCard
          label="Total Lenders"
          value={`${s.totalLenders}`}
          subtitle="deduplicated across markets"
        />
        <StatCard
          label="Market Types"
          value={`${s.activeMarkets + s.closedMarkets}`}
          subtitle={`${s.openTermCount} open · ${s.fixedTermCount} fixed`}
        />
        <StatCard
          label="Avg APR (TVL-wtd)"
          value={`${s.avgAPRWeighted.toFixed(2)}%`}
          accent
          subtitle="weighted by market debt"
        />
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
      >
        <CompositionPie
          title="TVL by Asset"
          description="Proportion of total debt by underlying token"
          slices={data.byAsset}
        />
        <CompositionPie
          title="TVL by Borrower"
          description="Concentration of debt across borrowers"
          slices={data.byBorrower}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
        }}
      >
        <StatCard
          small
          label="Total Protocol Fees"
          value={fmtUSD(s.totalProtocolFees)}
          accent
          subtitle="all-time revenue to protocol"
        />
        <StatCard
          small
          label="Total Interest to Lenders"
          value={fmtUSD(s.totalLenderInterest)}
          subtitle="base interest earned"
        />
        <StatCard
          small
          label="Total Penalty Fees"
          value={fmtUSD(s.totalDelinquencyFees)}
          warn
          subtitle="delinquency fees to lenders"
        />
      </div>
    </div>
  )
}
