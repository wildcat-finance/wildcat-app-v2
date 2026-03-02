"use client"

/* eslint-disable react/no-array-index-key, react/no-unstable-nested-components, @typescript-eslint/no-explicit-any */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts"

import { ChartCard } from "../../../components/ChartCard"
import { SectionError } from "../../../components/SectionError"
import { SectionSkeleton } from "../../../components/SectionSkeleton"
import { T, fmtUSD, fmtK, axisStyle, gridStyle } from "../../../constants"
import { useSubgraphQuery } from "../../../hooks/useSubgraphQuery"
import { fetchBorrowerBatches } from "../hooks/queries"

export function WithdrawalRecordSection({
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
    () => fetchBorrowerBatches(marketIds, decimalsMap, nameMap, priceMap),
    "BorrowerBatches",
    [marketIds.join(",")],
  )

  if (loading)
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "12px",
        }}
      >
        <SectionSkeleton height={340} label="Loading batches..." />
        <SectionSkeleton height={340} />
      </div>
    )
  if (error || !data)
    return (
      <SectionError label="Withdrawal batches" error={error || "No data"} />
    )

  const {
    batches,
    totalExpired,
    fullyPaidPct,
    paidLateCount,
    unpaidCount,
    avgShortfallPct,
    pendingBatches,
    totalQueued,
    nextExpiry,
  } = data
  const bc: Record<string, string> = {
    paid: T.accentGreen,
    "paid-late": T.accentAmber,
    unpaid: T.accentRed,
    pending: T.textDim,
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: "12px",
      }}
    >
      <ChartCard
        title="Withdrawal Batch Outcomes Over Time"
        description="Green = paid at expiry · Amber = paid late · Red = still unpaid"
        height={260}
      >
        {batches.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              fontFamily: T.fontBody,
              fontSize: "13px",
              color: T.textDim,
            }}
          >
            No expired batches yet
          </div>
        ) : (
          <ResponsiveContainer>
            <BarChart
              data={batches}
              margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
            >
              <CartesianGrid {...gridStyle} />
              <XAxis
                dataKey="label"
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                tickFormatter={fmtK}
                width={48}
              />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null
                  const b = batches.find((x) => x.label === label)
                  if (!b) return null
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
                      <div style={{ color: T.textMuted, marginBottom: "6px" }}>
                        Batch {label} — {b.marketName}
                      </div>
                      <div style={{ color: T.text }}>
                        Requested: {fmtUSD(b.requested)}
                      </div>
                      <div style={{ color: T.accentGreen }}>
                        Paid at expiry: {fmtUSD(b.paidAtExpiry)}
                      </div>
                      {b.shortfall > 0.01 && (
                        <div style={{ color: bc[b.status] }}>
                          Shortfall: {fmtUSD(b.shortfall)} (
                          {Math.round((b.shortfall / b.requested) * 100)}%)
                        </div>
                      )}
                    </div>
                  )
                }}
              />
              <Bar dataKey="paidAtExpiry" stackId="a" name="Paid">
                {batches.map((b, i) => (
                  <Cell
                    key={i}
                    fill={bc[b.status]}
                    opacity={b.status === "paid" ? 0.8 : 0.5}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="shortfall"
                stackId="a"
                name="Shortfall"
                radius={[2, 2, 0, 0]}
              >
                {batches.map((b, i) => (
                  <Cell
                    key={i}
                    fill={b.status === "unpaid" ? T.accentRed : T.accentAmber}
                    opacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <div
        style={{
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <span
          style={{
            fontFamily: T.fontBody,
            fontSize: "14px",
            fontWeight: 600,
            color: T.text,
          }}
        >
          Aggregate Batch Stats
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { l: "Total batches expired", v: `${totalExpired}` },
            { l: "Fully paid at expiry", v: `${fullyPaidPct}%` },
            { l: "Paid late", v: `${paidLateCount}` },
            { l: "Still unpaid", v: `${unpaidCount}` },
            { l: "Avg shortfall", v: `${avgShortfallPct}%` },
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
        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            paddingTop: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <span
            style={{
              fontFamily: T.fontBody,
              fontSize: "11px",
              color: T.textDim,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Current Queue
          </span>
          {[
            { l: "Pending batches", v: `${pendingBatches}` },
            { l: "Total queued", v: fmtUSD(totalQueued) },
            { l: "Next expiry", v: nextExpiry },
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
                }}
              >
                {r.l}
              </span>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "13px",
                  color: T.text,
                }}
              >
                {r.v}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
