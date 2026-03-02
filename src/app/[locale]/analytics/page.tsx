"use client"

import { CumulativeInterestSection } from "./components/CumulativeInterestSection"
import { DelinquencyChartSection } from "./components/DelinquencyChartSection"
import { DistributionSection } from "./components/DistributionSection"
import { FlowsChartSection } from "./components/FlowsChartSection"
import { GrowthSection } from "./components/GrowthSection"
import { ProtocolHeaderSection } from "./components/ProtocolHeaderSection"
import { RevenueChartSection } from "./components/RevenueChartSection"
import { SectionHeader } from "./components/SectionHeader"
import { TopMarketsSection } from "./components/TopMarketsSection"
import { TVLChartSection } from "./components/TVLChartSection"
import { T } from "./constants"
import { TimeSeriesProvider } from "./hooks/useTimeSeries"

export default function ProtocolOverviewPage() {
  return (
    <div
      style={{
        background: T.bg,
        minHeight: "100vh",
        color: T.text,
        fontFamily: T.fontBody,
      }}
    >
      <nav
        style={{
          borderBottom: `1px solid ${T.border}`,
          padding: "0 32px",
          height: "52px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          background: `${T.bg}ee`,
          backdropFilter: "blur(12px)",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <span
            style={{
              fontFamily: T.fontMono,
              fontSize: "15px",
              fontWeight: 700,
              color: T.accent,
              letterSpacing: "-0.03em",
            }}
          >
            wildcat
          </span>
          <div style={{ display: "flex", gap: "4px" }}>
            {["Overview", "Markets", "Borrowers", "Lenders"].map((tab) => (
              <span
                key={tab}
                style={{
                  fontFamily: T.fontBody,
                  fontSize: "13px",
                  fontWeight: tab === "Overview" ? 600 : 400,
                  color: tab === "Overview" ? T.text : T.textDim,
                  padding: "6px 14px",
                  borderRadius: T.radiusSm,
                  background:
                    tab === "Overview" ? `${T.accent}12` : "transparent",
                  cursor: "pointer",
                }}
              >
                {tab}
              </span>
            ))}
          </div>
        </div>
        <span
          style={{
            fontFamily: T.fontMono,
            fontSize: "10px",
            color: T.textDim,
            opacity: 0.6,
          }}
        >
          analytics
        </span>
      </nav>

      <TimeSeriesProvider>
        <main
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "24px 32px 64px",
            display: "flex",
            flexDirection: "column",
            gap: "28px",
          }}
        >
          {/* Section 1: Protocol stats + TVL composition + revenue cards */}
          <section>
            <SectionHeader
              title="Protocol Overview"
              subtitle="Current state of Wildcat Finance"
            />
            <div style={{ marginTop: "12px" }}>
              <ProtocolHeaderSection />
            </div>
          </section>

          {/* Section 2: TVL over time (full-width hero) */}
          <section>
            <SectionHeader
              title="Total Value Locked"
              subtitle="Protocol-wide debt trajectory"
            />
            <div style={{ marginTop: "12px" }}>
              <TVLChartSection />
            </div>
          </section>

          {/* Section 3: Revenue & Interest */}
          <section>
            <SectionHeader
              title="Revenue & Interest"
              subtitle="Protocol fee revenue and interest accrued to lenders"
            />
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <RevenueChartSection />
              <CumulativeInterestSection />
            </div>
          </section>

          {/* Section 4: Flows */}
          <section>
            <SectionHeader
              title="Fund Flows"
              subtitle="Protocol-wide deposits and withdrawals"
            />
            <div style={{ marginTop: "12px" }}>
              <FlowsChartSection />
            </div>
          </section>

          {/* Section 5: Delinquency */}
          <section>
            <SectionHeader
              title="Protocol Health"
              subtitle="Delinquency trends across the protocol"
            />
            <div style={{ marginTop: "12px" }}>
              <DelinquencyChartSection />
            </div>
          </section>

          {/* Section 6: Distributions */}
          <section>
            <SectionHeader
              title="Market Distributions"
              subtitle="How current market parameters and utilization are distributed"
            />
            <div style={{ marginTop: "12px" }}>
              <DistributionSection />
            </div>
          </section>

          {/* Section 7: Growth */}
          <section>
            <SectionHeader
              title="Growth & Network Health"
              subtitle="Trailing indicators of protocol adoption and network effects"
            />
            <div style={{ marginTop: "12px" }}>
              <GrowthSection />
            </div>
          </section>

          {/* Section 8: Top markets table */}
          <section>
            <SectionHeader
              title="Top Markets"
              subtitle="Active markets ranked by total debt — click any row to view detail"
            />
            <div style={{ marginTop: "12px" }}>
              <TopMarketsSection />
            </div>
          </section>
        </main>
      </TimeSeriesProvider>
    </div>
  )
}
