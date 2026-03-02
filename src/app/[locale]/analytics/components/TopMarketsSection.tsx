"use client"

import { SectionError } from "./SectionError"
import { SectionSkeleton } from "./SectionSkeleton"
import { T, fmtUSD } from "../constants"
import { fetchAllMarkets } from "../hooks/queries"
import { useSubgraphQuery } from "../hooks/useSubgraphQuery"

export function TopMarketsSection() {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchAllMarkets(),
    "TopMarkets",
    [],
  )
  if (loading)
    return <SectionSkeleton height={360} label="Loading markets table..." />
  if (error || !data)
    return <SectionError label="Markets table" error={error || "No data"} />

  const active = data.markets
    .filter((m) => !m.isClosed)
    .sort((a, b) => b.debt - a.debt)
    .slice(0, 15)
  const sc: Record<string, string> = {
    Healthy: T.accentGreen,
    Delinquent: T.accentAmber,
    Penalty: T.accentRed,
  }

  return (
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
          gridTemplateColumns: "2fr 80px 80px 110px 100px 90px 90px",
          padding: "12px 24px",
          borderBottom: `1px solid ${T.border}`,
          background: `${T.bgSkeleton}60`,
        }}
      >
        {[
          "Market",
          "Asset",
          "Type",
          "Total Debt",
          "APR",
          "Utilization",
          "Status",
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
      {active.map((m, i) => {
        let statusLabel = "Healthy"
        if (m.isIncurringPenalties) statusLabel = "Penalty"
        else if (m.isDelinquent) statusLabel = "Delinquent"
        return (
          <div
            key={m.id}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 80px 80px 110px 100px 90px 90px",
              padding: "14px 24px",
              borderBottom:
                i < active.length - 1 ? `1px solid ${T.borderSubtle}` : "none",
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
                  fontFamily: T.fontBody,
                  fontSize: "13px",
                  color: T.text,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {m.name}
              </span>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "11px",
                  color: T.accent,
                  opacity: 0.5,
                }}
              >
                {"\u2192"}
              </span>
            </div>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.textMuted,
              }}
            >
              {m.assetSymbol}
            </span>
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: "12px",
                color: T.textDim,
              }}
            >
              {m.marketType.replace("-term", "")}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.text,
                fontWeight: 600,
              }}
            >
              {fmtUSD(m.debt)}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.accent,
              }}
            >
              {m.apr.toFixed(2)}%
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: m.utilization > 90 ? T.accentAmber : T.textMuted,
              }}
            >
              {m.utilization.toFixed(0)}%
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "10px",
                fontWeight: 600,
                color: sc[statusLabel] || T.textDim,
                textTransform: "uppercase",
              }}
            >
              {statusLabel}
            </span>
          </div>
        )
      })}
    </div>
  )
}
