"use client"

/* eslint-disable react/no-array-index-key */

import { SectionError } from "../../../components/SectionError"
import { SectionSkeleton } from "../../../components/SectionSkeleton"
import { StatCard } from "../../../components/StatCard"
import { T } from "../../../constants"
import { useSubgraphQuery } from "../../../hooks/useSubgraphQuery"
import { fetchBorrowerParamChanges } from "../hooks/queries"

export function ParameterHistorySection({
  marketIds,
  decimalsMap,
  nameMap,
  priceMap,
}: {
  marketIds: string[]
  decimalsMap: Record<string, number>
  nameMap: Record<string, string>
  priceMap: Record<string, number>
}) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchBorrowerParamChanges(marketIds, decimalsMap, nameMap, priceMap),
    "BorrowerParamHistory",
    [marketIds.join(",")],
  )

  if (loading)
    return <SectionSkeleton height={120} label="Loading parameter history..." />
  if (error) return <SectionError label="Parameter history" error={error} />

  const changes = data || []

  // Compute summary stats
  const paramCounts = new Map<string, number>()
  changes.forEach((c) => {
    paramCounts.set(c.parameter, (paramCounts.get(c.parameter) || 0) + 1)
  })
  const mostChanged =
    paramCounts.size > 0
      ? Array.from(paramCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : "—"

  const marketsTouched = new Set(changes.map((c) => c.market))
  const marketsUnchanged = marketIds.length - marketsTouched.size

  const cols = ["Date", "Market", "Parameter", "Old Value", "New Value", "Tx"]

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
          label="Total Changes"
          value={`${changes.length}`}
          subtitle="across all markets"
        />
        <StatCard
          small
          label="Most Changed"
          value={mostChanged}
          subtitle="parameter type"
        />
        <StatCard
          small
          label="Markets Unchanged"
          value={`${marketsUnchanged}`}
          subtitle="zero changes since creation"
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
            gridTemplateColumns: "120px 1.5fr 1fr 110px 110px 100px",
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
            No parameter changes across any market
          </div>
        ) : (
          changes.map((ch, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1.5fr 1fr 110px 110px 100px",
                padding: "14px 24px",
                borderBottom:
                  i < changes.length - 1
                    ? `1px solid ${T.borderSubtle}`
                    : "none",
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
                  fontFamily: T.fontMono,
                  fontSize: "12px",
                  color: T.accent,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {ch.market}
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
    </div>
  )
}
