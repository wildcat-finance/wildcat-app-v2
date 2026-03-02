"use client"

import { SectionError } from "../../../components/SectionError"
import { SectionSkeleton } from "../../../components/SectionSkeleton"
import { StatCard } from "../../../components/StatCard"
import { T, fmtUSD, truncAddr } from "../../../constants"
import { useSubgraphQuery } from "../../../hooks/useSubgraphQuery"
import { fetchBorrowerMarkets } from "../hooks/queries"
import type { BorrowerProfile } from "../types"

function ReliabilitySignals({ profile }: { profile: BorrowerProfile }) {
  return (
    <div
      style={{
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        padding: "16px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
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
        Reliability Signals
      </span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "20px",
        }}
      >
        {[
          {
            label: "Active Markets",
            value: `${profile.activeMarkets}`,
            sub: "currently open",
          },
          {
            label: "Closed Markets",
            value: `${profile.closedMarkets}`,
            sub: "successfully completed",
          },
          {
            label: "Time on Protocol",
            value: profile.timeOnProtocol,
            sub: "since first market",
          },
          {
            label: "Assets Used",
            value: `${profile.assetsUsed.length}`,
            sub: profile.assetsUsed.join(", ") || "—",
          },
          {
            label: "Total Borrowed",
            value: fmtUSD(profile.totalBorrowed),
            sub: "all-time volume",
          },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "20px",
                fontWeight: 600,
                color: T.text,
              }}
            >
              {m.value}
            </span>
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: "11px",
                fontWeight: 500,
                color: T.textMuted,
              }}
            >
              {m.label}
            </span>
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: "10px",
                color: T.textDim,
              }}
            >
              {m.sub}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BorrowerHeaderSection({ addr }: { addr: string }) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchBorrowerMarkets(addr),
    "BorrowerHeader",
    [addr],
  )
  if (loading)
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: "12px",
        }}
      >
        <SectionSkeleton height={220} label="Loading borrower info..." />
        <SectionSkeleton height={220} />
      </div>
    )
  if (error || !data)
    return <SectionError label="Borrower info" error={error || "No data"} />

  const p = data.profile

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: "12px",
        }}
      >
        {/* Identity card */}
        <div
          style={{
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius,
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: `linear-gradient(135deg, ${T.accent}40, ${T.accentPurple}40)`,
                border: `1px solid ${T.accent}30`,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "14px",
                  fontWeight: 600,
                  color: T.text,
                }}
              >
                {truncAddr(p.address)}
              </span>
              <span
                style={{
                  fontFamily: T.fontBody,
                  fontSize: "11px",
                  color: T.textDim,
                }}
              >
                Borrower
              </span>
            </div>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {[
              { l: "First Market Created", v: p.firstMarketCreated },
              { l: "Time on Protocol", v: p.timeOnProtocol },
              { l: "Active Markets", v: `${p.activeMarkets}` },
              { l: "Closed Markets", v: `${p.closedMarkets}` },
              { l: "Assets Used", v: p.assetsUsed.join(", ") || "—" },
            ].map((r) => (
              <div
                key={r.l}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
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

        {/* Portfolio metrics grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "8px",
          }}
        >
          <StatCard
            small
            label="Total Debt"
            value={fmtUSD(p.totalDebt)}
            accent
            subtitle="across all active markets"
          />
          <StatCard
            small
            label="Total Capacity"
            value={fmtUSD(p.totalCapacity)}
            subtitle="aggregate max supply"
          />
          <StatCard
            small
            label="Avg Utilization"
            value={`${p.avgUtilization.toFixed(1)}%`}
            subtitle="debt-weighted across markets"
          />
          <StatCard
            small
            label="Avg APR"
            value={`${p.avgAPR.toFixed(2)}%`}
            accent
            subtitle="debt-weighted base APR"
          />
          <StatCard
            small
            label="Total Borrowed"
            value={fmtUSD(p.totalBorrowed)}
            subtitle="all-time"
          />
          <StatCard
            small
            label="Total Repaid"
            value={fmtUSD(p.totalRepaid)}
            subtitle="all-time"
          />
        </div>
      </div>

      <ReliabilitySignals profile={p} />
    </div>
  )
}
