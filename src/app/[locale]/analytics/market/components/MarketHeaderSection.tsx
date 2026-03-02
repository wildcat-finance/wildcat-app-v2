"use client"

import { SectionError } from "../../components/SectionError"
import { SectionSkeleton } from "../../components/SectionSkeleton"
import { StatCard } from "../../components/StatCard"
import { T, fmtUSD, truncAddr } from "../../constants"
import { useSubgraphQuery } from "../../hooks/useSubgraphQuery"
import { fetchMarketAndLenders } from "../hooks/queries"

export function MarketHeaderSection({ addr }: { addr: string }) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchMarketAndLenders(addr),
    "MarketHeader",
    [addr],
  )
  if (loading)
    return (
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
      >
        <SectionSkeleton height={220} label="Loading market info..." />
        <SectionSkeleton height={220} />
      </div>
    )
  if (error || !data)
    return <SectionError label="Market info" error={error || "No data"} />
  const m = data.market
  const sc: Record<string, string> = {
    Healthy: T.accentGreen,
    Delinquent: T.accentAmber,
    Penalty: T.accentRed,
    Closed: T.textDim,
  }
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
    >
      <div
        style={{
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              fontFamily: T.fontBody,
              fontSize: "22px",
              fontWeight: 700,
              color: T.text,
              letterSpacing: "-0.02em",
            }}
          >
            {m.name}
          </span>
          <span
            style={{
              fontFamily: T.fontMono,
              fontSize: "10px",
              fontWeight: 600,
              color: sc[m.status] || T.textDim,
              background: `${sc[m.status] || T.textDim}18`,
              padding: "3px 10px",
              borderRadius: "20px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {m.status}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { l: "Borrower", v: `${truncAddr(m.borrower)} →`, link: true },
            { l: "Asset", v: m.assetSymbol },
            { l: "Market Type", v: m.marketType },
            { l: "Created", v: m.createdAt.toLocaleDateString() },
          ].map((r) => (
            <div
              key={r.l}
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <span
                style={{
                  fontFamily: T.fontBody,
                  fontSize: "12px",
                  color: T.textDim,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {r.l}
              </span>
              <span
                style={{
                  fontFamily: r.link ? T.fontMono : T.fontBody,
                  fontSize: "13px",
                  color: r.link ? T.accent : T.text,
                  cursor: r.link ? "pointer" : "default",
                }}
              >
                {r.v}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "8px",
        }}
      >
        <StatCard small label="Total Debt" value={fmtUSD(m.totalDebt)} accent />
        <StatCard
          small
          label="Capacity"
          value={fmtUSD(m.capacity)}
          subtitle={`${m.utilizationPct.toFixed(1)}% utilized`}
        />
        <StatCard
          small
          label="Current APR"
          value={`${m.currentAPR.toFixed(2)}%`}
          accent
        />
        <StatCard
          small
          label="Reserve Ratio"
          value={`${m.reserveRatioActual.toFixed(
            0,
          )}% / ${m.reserveRatioTarget.toFixed(0)}%`}
          subtitle="actual / target"
        />
        <StatCard
          small
          label="Penalty APR"
          value={`${m.penaltyAPR.toFixed(2)}%`}
          subtitle={`grace: ${m.gracePeriodHours}h`}
        />
        <StatCard
          small
          label="Withdrawal Cycle"
          value={`${m.withdrawalCycleHours}h`}
        />
        <StatCard small label="Active Lenders" value={`${m.activeLenders}`} />
        <StatCard
          small
          label="Protocol Fee"
          value={`${m.protocolFeePct.toFixed(2)}%`}
        />
        <StatCard
          small
          label="Avg Deposit"
          value={fmtUSD(m.avgDeposit)}
          subtitle="per lender position"
        />
      </div>
    </div>
  )
}
