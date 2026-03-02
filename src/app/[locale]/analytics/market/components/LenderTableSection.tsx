"use client"

/* eslint-disable react/no-array-index-key */

import { SectionError } from "../../components/SectionError"
import { SectionSkeleton } from "../../components/SectionSkeleton"
import { StatCard } from "../../components/StatCard"
import { T, fmtUSD } from "../../constants"
import { useSubgraphQuery } from "../../hooks/useSubgraphQuery"
import { fetchLenderTable } from "../hooks/queries"

export function LenderTableSection({
  addr,
  sf,
  dec,
  totalDebt,
}: {
  addr: string
  sf: string
  dec: number
  totalDebt: number
}) {
  const {
    data: lenders,
    loading,
    error,
  } = useSubgraphQuery(
    () => fetchLenderTable(addr, sf, dec, totalDebt),
    "Lenders",
    [addr, sf, dec, totalDebt],
  )
  if (loading)
    return <SectionSkeleton height={300} label="Loading lenders..." />
  if (error) return <SectionError label="Lenders" error={error} />
  const ls = lenders || []
  const top1 = ls[0]?.pctOfMarket || 0
  const top3 = ls.slice(0, 3).reduce((s, l) => s + l.pctOfMarket, 0)
  const hhi = Math.round(ls.reduce((s, l) => s + l.pctOfMarket ** 2, 0))
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
        }}
      >
        <StatCard
          small
          label="Top Lender"
          value={`${top1.toFixed(1)}%`}
          subtitle="share of total debt"
        />
        <StatCard
          small
          label="Top 3 Lenders"
          value={`${top3.toFixed(1)}%`}
          subtitle="combined share"
        />
        <StatCard
          small
          label="Lender HHI"
          value={`${hhi}`}
          subtitle="0 = dispersed · 10000 = single lender"
        />
      </div>
      <div
        style={{
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 120px 130px 130px 130px 100px",
            padding: "12px 24px",
            borderBottom: `1px solid ${T.border}`,
            background: `${T.bgSkeleton}60`,
          }}
        >
          {[
            "Lender",
            "First Deposit",
            "Total Deposited",
            "Current Balance",
            "Interest Earned",
            "% of Market",
          ].map((c) => (
            <span
              key={c}
              style={{
                fontFamily: T.fontBody,
                fontSize: "11px",
                fontWeight: 600,
                color: T.textDim,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {c}
            </span>
          ))}
        </div>
        {ls.map((l, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 120px 130px 130px 130px 100px",
              padding: "14px 24px",
              borderBottom:
                i < ls.length - 1 ? `1px solid ${T.borderSubtle}` : "none",
              cursor: "pointer",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLDivElement).style.background =
                T.bgCardHover
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLDivElement).style.background =
                "transparent"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "12px",
                  color: T.accent,
                }}
              >
                {l.address}
              </span>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "12px",
                  color: T.accent,
                  opacity: 0.5,
                }}
              >
                →
              </span>
            </div>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.textMuted,
              }}
            >
              {l.firstDeposit}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.text,
              }}
            >
              {fmtUSD(l.totalDeposited)}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.text,
                fontWeight: 600,
              }}
            >
              {fmtUSD(l.balance)}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.accentGreen,
              }}
            >
              {fmtUSD(l.interest)}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.textMuted,
              }}
            >
              {l.pctOfMarket.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          fontFamily: T.fontBody,
          fontSize: "11px",
          color: T.textDim,
          padding: "0 4px",
        }}
      >
        Sorted by current balance descending · click any row to view lender
        portfolio
      </div>
    </div>
  )
}
