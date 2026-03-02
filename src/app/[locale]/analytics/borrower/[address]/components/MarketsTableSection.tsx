"use client"

/* eslint-disable react/no-array-index-key */

import { T, fmtUSD } from "../../../constants"
import type { BorrowerMarketRow } from "../types"

const statusColors: Record<string, string> = {
  Healthy: "#34d399",
  Delinquent: "#fbbf24",
  Penalty: "#f87171",
  Closed: "#64748b",
}

const cols = [
  { label: "Market", width: "2fr" },
  { label: "Asset", width: "80px" },
  { label: "Type", width: "90px" },
  { label: "Total Debt", width: "110px" },
  { label: "Capacity", width: "110px" },
  { label: "APR", width: "80px" },
  { label: "Utilization", width: "90px" },
  { label: "Status", width: "80px" },
  { label: "Created", width: "100px" },
]

const gridCols = cols.map((c) => c.width).join(" ")

export function MarketsTableSection({
  markets,
}: {
  markets: BorrowerMarketRow[]
}) {
  if (markets.length === 0) {
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
        No markets found for this borrower.
      </div>
    )
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
          gridTemplateColumns: gridCols,
          padding: "12px 24px",
          borderBottom: `1px solid ${T.border}`,
          background: `${T.bgSkeleton}60`,
        }}
      >
        {cols.map((c) => (
          <span
            key={c.label}
            style={{
              fontFamily: T.fontBody,
              fontSize: "11px",
              fontWeight: 600,
              color: T.textDim,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {c.label}
          </span>
        ))}
      </div>
      {markets.map((m, i) => {
        const sc = statusColors[m.status] || T.textDim
        return (
          <div
            key={m.id}
            style={{
              display: "grid",
              gridTemplateColumns: gridCols,
              padding: "14px 24px",
              borderBottom:
                i < markets.length - 1 ? `1px solid ${T.borderSubtle}` : "none",
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "12px",
                  color: T.accent,
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
                color: T.text,
              }}
            >
              {m.asset}
            </span>
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: "12px",
                color: T.textMuted,
              }}
            >
              {m.marketType}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.text,
                fontWeight: 600,
              }}
            >
              {fmtUSD(m.totalDebt)}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.textMuted,
              }}
            >
              {fmtUSD(m.capacity)}
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
                color: T.textMuted,
              }}
            >
              {m.utilization.toFixed(1)}%
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "10px",
                fontWeight: 600,
                color: sc,
                background: `${sc}18`,
                padding: "2px 8px",
                borderRadius: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                width: "fit-content",
              }}
            >
              {m.status}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "11px",
                color: T.textDim,
              }}
            >
              {m.created}
            </span>
          </div>
        )
      })}
    </div>
  )
}
