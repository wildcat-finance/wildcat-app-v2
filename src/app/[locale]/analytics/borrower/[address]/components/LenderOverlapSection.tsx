"use client"

/* eslint-disable react/no-array-index-key, react/no-unstable-nested-components, @typescript-eslint/no-explicit-any */

import { useMemo } from "react"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

import { ChartCard } from "../../../components/ChartCard"
import { SectionError } from "../../../components/SectionError"
import { SectionSkeleton } from "../../../components/SectionSkeleton"
import { StatCard } from "../../../components/StatCard"
import {
  T,
  fmtUSD,
  fmtK,
  truncAddr,
  axisStyle,
  gridStyle,
} from "../../../constants"
import { useSubgraphQuery } from "../../../hooks/useSubgraphQuery"
import { fetchBorrowerLenders } from "../hooks/queries"

const SIZE_BUCKETS = [
  { label: "<$1K", max: 1_000 },
  { label: "$1K-10K", max: 10_000 },
  { label: "$10K-100K", max: 100_000 },
  { label: "$100K-1M", max: 1_000_000 },
  { label: "$1M+", max: Infinity },
]

export function LenderOverlapSection({
  marketIds,
  decimalsMap,
  sfMap,
  priceMap,
  totalDebt,
}: {
  marketIds: string[]
  decimalsMap: Record<string, number>
  sfMap: Record<string, string>
  priceMap: Record<string, number>
  totalDebt: number
}) {
  const {
    data: lenders,
    loading,
    error,
  } = useSubgraphQuery(
    () =>
      fetchBorrowerLenders(marketIds, decimalsMap, sfMap, priceMap, totalDebt),
    "BorrowerLenders",
    [marketIds.join(","), totalDebt],
  )

  const ls = lenders || []

  const { distData, uniqueCount, repeatCount, avgPosition, topExposure } =
    useMemo(() => {
      const uCount = ls.length
      const rCount = ls.filter((l) => l.marketCount > 1).length
      const avgPos =
        ls.length > 0
          ? ls.reduce((s, l) => s + l.currentBalance, 0) / ls.length
          : 0
      const topExp = ls.length > 0 ? ls[0].currentBalance : 0

      // Build deposit size distribution
      const bucketCounts = SIZE_BUCKETS.map(() => ({
        count: 0,
        totalValue: 0,
      }))
      ls.forEach((l) => {
        const idx = SIZE_BUCKETS.findIndex((b) => l.currentBalance < b.max)
        if (idx >= 0) {
          bucketCounts[idx].count += 1
          bucketCounts[idx].totalValue += l.currentBalance
        }
      })
      const dist = SIZE_BUCKETS.map((b, i) => ({
        range: b.label,
        lenders: bucketCounts[i].count,
        totalValue: bucketCounts[i].totalValue,
      }))

      return {
        distData: dist,
        uniqueCount: uCount,
        repeatCount: rCount,
        avgPosition: avgPos,
        topExposure: topExp,
      }
    }, [ls])

  if (loading)
    return <SectionSkeleton height={300} label="Loading lenders..." />
  if (error) return <SectionError label="Lender overlap" error={error} />

  const cols = [
    "Lender",
    "Markets",
    "Total Deposited",
    "Current Balance",
    "Interest Earned",
    "% of Debt",
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
        }}
      >
        <StatCard
          small
          label="Unique Lenders"
          value={`${uniqueCount}`}
          subtitle="across all markets"
        />
        <StatCard
          small
          label="Repeat Lenders"
          value={`${repeatCount}`}
          subtitle="in 2+ markets"
        />
        <StatCard
          small
          label="Avg Position Size"
          value={fmtUSD(avgPosition)}
          subtitle="per lender"
        />
        <StatCard
          small
          label="Top Lender Exposure"
          value={fmtUSD(topExposure)}
          subtitle="largest aggregate position"
        />
      </div>

      {ls.length > 0 && (
        <ChartCard
          title="Deposit Size Distribution"
          description="Number of lenders by current balance size bucket"
          height={200}
          fullWidth
        >
          <ResponsiveContainer>
            <BarChart
              data={distData}
              margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
            >
              <CartesianGrid {...gridStyle} />
              <XAxis
                dataKey="range"
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={36}
              />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  if (!d) return null
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
                      <div
                        style={{
                          color: T.text,
                          fontWeight: 600,
                          marginBottom: "4px",
                        }}
                      >
                        {label}
                      </div>
                      <div style={{ color: T.accent }}>
                        {d.lenders} lender{d.lenders !== 1 ? "s" : ""}
                      </div>
                      <div style={{ color: T.textMuted }}>
                        Total: {fmtK(d.totalValue)}
                      </div>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="lenders"
                fill={T.accent}
                opacity={0.75}
                radius={[3, 3, 0, 0]}
                name="Lenders"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

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
            gridTemplateColumns: "1.5fr 80px 120px 120px 120px 100px",
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
        {ls.length === 0 ? (
          <div
            style={{
              padding: "20px 24px",
              fontFamily: T.fontBody,
              fontSize: "13px",
              color: T.textDim,
            }}
          >
            No active lenders found
          </div>
        ) : (
          ls.slice(0, 25).map((l, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 80px 120px 120px 120px 100px",
                padding: "14px 24px",
                borderBottom:
                  i < Math.min(ls.length, 25) - 1
                    ? `1px solid ${T.borderSubtle}`
                    : "none",
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
                  }}
                >
                  {truncAddr(l.address)}
                </span>
                {l.marketCount > 1 && (
                  <span
                    style={{
                      fontFamily: T.fontMono,
                      fontSize: "9px",
                      color: T.accentPurple,
                      background: `${T.accentPurple}18`,
                      padding: "1px 6px",
                      borderRadius: "8px",
                    }}
                  >
                    {l.marketCount}x
                  </span>
                )}
              </div>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "12px",
                  color: T.textMuted,
                }}
              >
                {l.marketCount}
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
                {fmtUSD(l.currentBalance)}
              </span>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "12px",
                  color: T.accentGreen,
                }}
              >
                {fmtUSD(l.interestEarned)}
              </span>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "12px",
                  color: T.textMuted,
                }}
              >
                {l.pctOfDebt.toFixed(1)}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
