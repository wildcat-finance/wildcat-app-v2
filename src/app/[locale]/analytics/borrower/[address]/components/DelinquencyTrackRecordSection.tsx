"use client"

/* eslint-disable react/no-unstable-nested-components, @typescript-eslint/no-explicit-any */

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
import { T, axisStyle, gridStyle } from "../../../constants"
import { useSubgraphQuery } from "../../../hooks/useSubgraphQuery"
import { fetchBorrowerDelinquency } from "../hooks/queries"

export function DelinquencyTrackRecordSection({
  marketIds,
  gracePeriodMap,
  nameMap,
}: {
  marketIds: string[]
  gracePeriodMap: Record<string, number>
  nameMap: Record<string, string>
}) {
  const {
    data: events,
    loading,
    error,
  } = useSubgraphQuery(
    () => fetchBorrowerDelinquency(marketIds, gracePeriodMap, nameMap),
    "BorrowerDelinquency",
    [marketIds.join(",")],
  )

  const evts = events || []

  const { chartData, maxDur, avgCure, penaltyCount, currentlyDelinquent } =
    useMemo(() => {
      if (evts.length === 0) {
        return {
          chartData: [] as {
            name: string
            graceHours: number
            penaltyHours: number
            events: number
          }[],
          maxDur: 0,
          avgCure: 0,
          penaltyCount: 0,
          currentlyDelinquent: 0,
        }
      }

      const mDur = Math.max(...evts.map((e) => e.durationHours))
      const aCure = Math.round(
        evts.reduce((s, e) => s + e.durationHours, 0) / evts.length,
      )
      const pCount = evts.filter((e) => e.penalized).length
      const curDelq = evts.filter((e) => !e.end).length

      // Aggregate per market: split each event into grace vs penalty hours
      const agg = new Map<
        string,
        { name: string; grace: number; penalty: number; count: number }
      >()
      evts.forEach((e) => {
        const gpSec = gracePeriodMap[e.marketId] ?? 0
        const gpHours = gpSec / 3600
        const existing = agg.get(e.marketId) || {
          name: e.marketName,
          grace: 0,
          penalty: 0,
          count: 0,
        }
        existing.count += 1
        if (e.penalized) {
          existing.grace += Math.min(gpHours, e.durationHours)
          existing.penalty += Math.max(0, e.durationHours - gpHours)
        } else {
          existing.grace += e.durationHours
        }
        agg.set(e.marketId, existing)
      })

      const data = Array.from(agg.values())
        .map((v) => ({
          name: v.name.length > 20 ? `${v.name.slice(0, 18)}..` : v.name,
          graceHours: Math.round(v.grace),
          penaltyHours: Math.round(v.penalty),
          events: v.count,
        }))
        .sort(
          (a, b) =>
            b.graceHours + b.penaltyHours - a.graceHours - a.penaltyHours,
        )

      return {
        chartData: data,
        maxDur: mDur,
        avgCure: aCure,
        penaltyCount: pCount,
        currentlyDelinquent: curDelq,
      }
    }, [evts, gracePeriodMap])

  if (loading)
    return <SectionSkeleton height={200} label="Loading delinquency..." />
  if (error)
    return <SectionError label="Delinquency track record" error={error} />

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "8px",
        }}
      >
        <StatCard
          small
          label="Total Events"
          value={`${evts.length}`}
          subtitle="across all markets"
        />
        <StatCard
          small
          label="Longest Event"
          value={evts.length ? `${maxDur}h` : "\u2014"}
          subtitle="single delinquency"
        />
        <StatCard
          small
          label="Avg Cure Time"
          value={evts.length ? `${avgCure}h` : "\u2014"}
          subtitle="hours"
        />
        <StatCard
          small
          label="Penalty Events"
          value={`${penaltyCount}`}
          warn={penaltyCount > 0}
          subtitle="exceeded grace period"
        />
        <StatCard
          small
          label="Currently Delinquent"
          value={`${currentlyDelinquent}`}
          warn={currentlyDelinquent > 0}
          subtitle="markets right now"
        />
      </div>

      {evts.length > 0 ? (
        <ChartCard
          title="Delinquent Hours by Market"
          description="Amber = within grace period \u00b7 Red = penalties active"
          height={Math.max(160, chartData.length * 44 + 40)}
          fullWidth
        >
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 24, bottom: 0, left: 4 }}
            >
              <CartesianGrid {...gridStyle} horizontal={false} />
              <XAxis
                type="number"
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}h`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                width={140}
              />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  if (!d) return null
                  const total = d.graceHours + d.penaltyHours
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
                          marginBottom: "6px",
                        }}
                      >
                        {d.name}
                      </div>
                      <div style={{ color: T.textMuted }}>
                        {d.events} event{d.events !== 1 ? "s" : ""} \u00b7{" "}
                        {total}h total
                      </div>
                      <div style={{ color: T.accentAmber }}>
                        Grace: {d.graceHours}h
                      </div>
                      {d.penaltyHours > 0 && (
                        <div style={{ color: T.accentRed }}>
                          Penalized: {d.penaltyHours}h
                        </div>
                      )}
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="graceHours"
                stackId="a"
                fill={T.accentAmber}
                opacity={0.8}
                name="Within Grace"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="penaltyHours"
                stackId="a"
                fill={T.accentRed}
                opacity={0.85}
                name="Penalized"
                radius={[0, 3, 3, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : (
        <div
          style={{
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius,
            padding: "20px 24px",
            fontFamily: T.fontBody,
            fontSize: "13px",
            color: T.accentGreen,
          }}
        >
          This borrower has never been delinquent across any market.
        </div>
      )}
    </div>
  )
}
