"use client"

/* eslint-disable react/no-array-index-key, react/no-unstable-nested-components, @typescript-eslint/no-explicit-any */

import { useState } from "react"

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

import { BatchDetailDrawer } from "./BatchDetailDrawer"
import { ChartCard } from "../../components/ChartCard"
import { SectionError } from "../../components/SectionError"
import { SectionSkeleton } from "../../components/SectionSkeleton"
import { T, fmtUSD, fmtK, axisStyle, gridStyle } from "../../constants"
import { useSubgraphQuery } from "../../hooks/useSubgraphQuery"
import { fetchBatches } from "../hooks/queries"

function fmtToken(v: number, sym: string): string {
  return `${fmtK(v)} ${sym}`
}

export function WithdrawalBatchSection({
  addr,
  dec,
  symbol,
  isStablecoin,
}: {
  addr: string
  dec: number
  symbol: string
  isStablecoin: boolean
}) {
  const fmt = (v: number) => (isStablecoin ? fmtUSD(v) : fmtToken(v, symbol))
  const [selectedBatch, setSelectedBatch] = useState<{
    id: string
    label: string
  } | null>(null)
  const { data, loading, error } = useSubgraphQuery(
    () => fetchBatches(addr, dec),
    "Batches",
    [addr, dec],
  )
  if (loading)
    return (
      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}
      >
        <SectionSkeleton height={340} label="Loading batches..." />
        <SectionSkeleton height={340} />
      </div>
    )
  if (error || !data)
    return (
      <SectionError label="Withdrawal batches" error={error || "No data"} />
    )
  const { batches, queue, stats } = data
  const bc: Record<string, string> = {
    paid: T.accentGreen,
    "paid-late": T.accentAmber,
    unpaid: T.accentRed,
    pending: T.textDim,
  }
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}
    >
      <ChartCard
        title="Withdrawal Batch History"
        description="Green = paid at expiry · Amber = paid late · Red = still unpaid · Click any bar for details"
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
              style={{ cursor: "pointer" }}
              onClick={(state: any) => {
                if (state?.activeTooltipIndex != null) {
                  const b = batches[state.activeTooltipIndex]
                  if (b) setSelectedBatch({ id: b.id, label: b.label })
                }
              }}
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
                        Batch {label}
                      </div>
                      <div style={{ color: T.text }}>
                        Requested: {fmt(b.requested)}
                      </div>
                      <div style={{ color: T.accentGreen }}>
                        Paid at expiry: {fmt(b.paidAtExpiry)}
                      </div>
                      {b.shortfall > 0.01 && (
                        <div style={{ color: bc[b.status] }}>
                          Shortfall: {fmt(b.shortfall)} (
                          {Math.round((b.shortfall / b.requested) * 100)}%)
                        </div>
                      )}
                      {b.status === "paid-late" && b.daysToClose && (
                        <div style={{ color: T.accentAmber }}>
                          Closed after {b.daysToClose}d
                        </div>
                      )}
                      {b.status === "unpaid" && (
                        <div style={{ color: T.accentRed }}>Still unpaid</div>
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
        <div>
          <span
            style={{
              fontFamily: T.fontBody,
              fontSize: "14px",
              fontWeight: 600,
              color: T.text,
            }}
          >
            Current Queue
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { l: "Pending batches", v: `${queue.pendingBatches}` },
            { l: "Total queued", v: fmt(queue.totalQueued) },
            { l: "Amount unfilled", v: fmt(queue.amountUnfilled) },
            { l: "Lenders waiting", v: `${queue.lendersWaiting}` },
            { l: "Next expiry", v: queue.nextExpiry },
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
            Historical
          </span>
          {[
            { l: "Total batches", v: `${stats.totalBatches}` },
            { l: "Fully paid at expiry", v: `${stats.fullyPaidPct}%` },
            { l: "Paid late", v: `${stats.paidLateCount}` },
            { l: "Still unpaid", v: `${stats.unpaidCount}` },
            { l: "Avg shortfall", v: `${stats.avgShortfallPct}%` },
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
      {selectedBatch && (
        <BatchDetailDrawer
          batchId={selectedBatch.id}
          batchLabel={selectedBatch.label}
          dec={dec}
          symbol={symbol}
          isStablecoin={isStablecoin}
          onClose={() => setSelectedBatch(null)}
        />
      )}
    </div>
  )
}
