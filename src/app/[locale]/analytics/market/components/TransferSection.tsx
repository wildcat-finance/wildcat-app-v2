"use client"

/* eslint-disable react/no-array-index-key */

import { SectionError } from "../../components/SectionError"
import { SectionSkeleton } from "../../components/SectionSkeleton"
import { T, fmtUSD } from "../../constants"
import { useSubgraphQuery } from "../../hooks/useSubgraphQuery"
import { fetchTransferData } from "../hooks/queries"

export function TransferSection({ addr, dec }: { addr: string; dec: number }) {
  const {
    data: transfers,
    loading,
    error,
  } = useSubgraphQuery(() => fetchTransferData(addr, dec), "Transfers", [
    addr,
    dec,
  ])
  if (loading)
    return <SectionSkeleton height={200} label="Loading transfers..." />
  if (error) return <SectionError label="Transfers" error={error} />
  const tx = transfers || []
  const totalVol = tx.reduce((s, t) => s + t.amount, 0)
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "12px",
        alignItems: "start",
      }}
    >
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
            gridTemplateColumns: "120px 1fr 1fr 110px 110px",
            padding: "12px 24px",
            borderBottom: `1px solid ${T.border}`,
            background: `${T.bgSkeleton}60`,
          }}
        >
          {["Date", "From", "To", "Amount", "Tx"].map((c) => (
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
        {tx.length === 0 ? (
          <div
            style={{
              padding: "20px 24px",
              fontFamily: T.fontBody,
              fontSize: "13px",
              color: T.textDim,
            }}
          >
            No token transfers recorded.
          </div>
        ) : (
          tx.map((t, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 1fr 110px 110px",
                padding: "14px 24px",
                borderBottom:
                  i < tx.length - 1 ? `1px solid ${T.borderSubtle}` : "none",
              }}
            >
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "12px",
                  color: T.textMuted,
                }}
              >
                {t.date}
              </span>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "12px",
                  color: T.accent,
                  cursor: "pointer",
                }}
              >
                {t.from}
              </span>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "12px",
                  color: T.accent,
                  cursor: "pointer",
                }}
              >
                {t.to}
              </span>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "12px",
                  color: T.text,
                }}
              >
                {fmtUSD(t.amount)}
              </span>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "11px",
                  color: T.accent,
                  cursor: "pointer",
                }}
              >
                {t.tx}
              </span>
            </div>
          ))
        )}
      </div>
      <div
        style={{
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          padding: "20px 24px",
          minWidth: "200px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <span
          style={{
            fontFamily: T.fontBody,
            fontSize: "11px",
            fontWeight: 600,
            color: T.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Transfer Summary
        </span>
        {[
          { l: "Total transfers", v: `${tx.length}` },
          { l: "Total volume", v: fmtUSD(totalVol) },
          { l: "Unique senders", v: `${new Set(tx.map((t) => t.from)).size}` },
          { l: "Unique receivers", v: `${new Set(tx.map((t) => t.to)).size}` },
        ].map((r) => (
          <div
            key={r.l}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: "12px",
                color: T.textDim,
              }}
            >
              {r.l}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "14px",
                fontWeight: 600,
                color: T.text,
              }}
            >
              {r.v}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
