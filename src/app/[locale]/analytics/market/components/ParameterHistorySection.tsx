"use client"

/* eslint-disable react/no-array-index-key */

import { SectionError } from "../../components/SectionError"
import { SectionSkeleton } from "../../components/SectionSkeleton"
import { T } from "../../constants"
import { useSubgraphQuery } from "../../hooks/useSubgraphQuery"
import { fetchParamChanges } from "../hooks/queries"

export function ParameterHistorySection({
  addr,
  dec,
}: {
  addr: string
  dec: number
}) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchParamChanges(addr, dec),
    "ParamHistory",
    [addr, dec],
  )
  if (loading)
    return <SectionSkeleton height={120} label="Loading parameter history..." />
  if (error) return <SectionError label="Parameter history" error={error} />
  const changes = data || []
  const cols = ["Date", "Parameter", "Old Value", "New Value", "Tx"]
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
          gridTemplateColumns: "140px 1fr 130px 130px 120px",
          padding: "12px 24px",
          borderBottom: `1px solid ${T.border}`,
          background: `${T.bgSkeleton}60`,
        }}
      >
        {cols.map((c) => (
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
      {changes.length === 0 ? (
        <div
          style={{
            padding: "20px 24px",
            fontFamily: T.fontBody,
            fontSize: "13px",
            color: T.accentGreen,
          }}
        >
          No parameter changes since market creation
        </div>
      ) : (
        changes.map((ch, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr 130px 130px 120px",
              padding: "14px 24px",
              borderBottom:
                i < changes.length - 1 ? `1px solid ${T.borderSubtle}` : "none",
            }}
          >
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.textMuted,
              }}
            >
              {ch.date}
            </span>
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: "13px",
                color: T.text,
              }}
            >
              {ch.parameter}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.accentRed,
              }}
            >
              {ch.oldValue}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.accentGreen,
              }}
            >
              {ch.newValue}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "11px",
                color: T.accent,
                cursor: "pointer",
              }}
            >
              {ch.tx}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
