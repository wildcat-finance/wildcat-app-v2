"use client"

/* eslint-disable no-nested-ternary */

import { SectionError } from "../../components/SectionError"
import { SectionSkeleton } from "../../components/SectionSkeleton"
import { StatCard } from "../../components/StatCard"
import { T } from "../../constants"
import { useSubgraphQuery } from "../../hooks/useSubgraphQuery"
import { fetchDelinquency } from "../hooks/queries"

export function DelinquencySection({
  addr,
  gracePeriodSec,
  gracePeriodHours,
}: {
  addr: string
  gracePeriodSec: number
  gracePeriodHours: number
}) {
  const {
    data: events,
    loading,
    error,
  } = useSubgraphQuery(
    () => fetchDelinquency(addr, gracePeriodSec),
    "Delinquency",
    [addr],
  )
  if (loading)
    return <SectionSkeleton height={200} label="Loading delinquency..." />
  if (error) return <SectionError label="Delinquency history" error={error} />
  const evts = events || []
  const maxDur =
    evts.length > 0 ? Math.max(...evts.map((e) => e.durationHours)) : 1
  const avgCure =
    evts.length > 0
      ? Math.round(evts.reduce((s, e) => s + e.durationHours, 0) / evts.length)
      : 0
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
          subtitle="delinquency entries"
        />
        <StatCard
          small
          label="Longest"
          value={
            evts.length
              ? `${Math.max(...evts.map((e) => e.durationHours))}h`
              : "—"
          }
          subtitle="single event"
        />
        <StatCard
          small
          label="Avg Time to Cure"
          value={evts.length ? `${avgCure}h` : "—"}
        />
        <StatCard
          small
          label="Penalty Events"
          value={`${evts.filter((e) => e.penalized).length}`}
          subtitle="exceeded grace period"
        />
        <StatCard
          small
          label="Current Status"
          value={evts.some((e) => !e.end) ? "DELINQUENT" : "OK"}
          warn={evts.some((e) => !e.end)}
          subtitle={evts.some((e) => !e.end) ? "active now" : "not delinquent"}
        />
      </div>
      {evts.length > 0 ? (
        <div
          style={{
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius,
            padding: "20px 24px",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: "14px",
                fontWeight: 600,
                color: T.text,
              }}
            >
              Delinquency Timeline
            </span>
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: "11px",
                color: T.textDim,
                marginLeft: "12px",
              }}
            >
              <span style={{ color: T.accentAmber }}>orange</span> = within
              grace · <span style={{ color: T.accentRed }}>red</span> =
              penalties
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {evts.map((evt) => (
              <div
                key={evt.id}
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <span
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: "11px",
                    color: T.textDim,
                    width: "90px",
                    flexShrink: 0,
                    textAlign: "right",
                  }}
                >
                  {evt.start.slice(5)}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "22px",
                    background: T.bgSkeleton,
                    borderRadius: "4px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${Math.max(
                        5,
                        (evt.durationHours / maxDur) * 100,
                      )}%`,
                      background: evt.penalized
                        ? `linear-gradient(90deg, ${T.accentAmber} 0%, ${
                            T.accentAmber
                          } ${Math.min(
                            100,
                            (gracePeriodHours / evt.durationHours) * 100,
                          )}%, ${T.accentRed} ${Math.min(
                            100,
                            (gracePeriodHours / evt.durationHours) * 100,
                          )}%, ${T.accentRed} 100%)`
                        : T.accentAmber,
                      borderRadius: "4px",
                      opacity: 0.85,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: "11px",
                    color: evt.penalized ? T.accentRed : T.accentAmber,
                    width: "50px",
                    flexShrink: 0,
                  }}
                >
                  {evt.durationHours}h{!evt.end ? " ⟳" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
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
          This market has never been delinquent.
        </div>
      )}
    </div>
  )
}
