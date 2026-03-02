"use client"

/* eslint-disable no-nested-ternary */

import { DebtChartSection } from "./components/DebtChartSection"
import { DelinquencySection } from "./components/DelinquencySection"
import { DepositsWithdrawalsSection } from "./components/DepositsWithdrawalsSection"
import { InterestSection } from "./components/InterestSection"
import { LenderTableSection } from "./components/LenderTableSection"
import { MarketHeaderSection } from "./components/MarketHeaderSection"
import { ParameterHistorySection } from "./components/ParameterHistorySection"
import { TransferSection } from "./components/TransferSection"
import { WithdrawalBatchSection } from "./components/WithdrawalBatchSection"
import { DEFAULT_MARKET } from "./constants"
import { fetchMarketAndLenders, fetchParamChanges } from "./hooks/queries"
import { SectionError } from "../components/SectionError"
import { SectionHeader } from "../components/SectionHeader"
import { SectionSkeleton } from "../components/SectionSkeleton"
import { T, truncAddr } from "../constants"
import { useSubgraphQuery } from "../hooks/useSubgraphQuery"

export default function MarketDetailPage({
  marketAddress = DEFAULT_MARKET,
}: {
  marketAddress?: string
}) {
  const addr = marketAddress.toLowerCase()

  // Market header loads first — other sections depend on assetDecimals, scaleFactor, etc.
  const headerState = useSubgraphQuery(
    () => fetchMarketAndLenders(addr),
    "MarketCore",
    [addr],
  )
  const m = headerState.data?.market ?? null
  // Parameter changes load independently but are also passed to the debt chart for reference lines
  const paramState = useSubgraphQuery(
    () => (m ? fetchParamChanges(addr, m.assetDecimals) : Promise.resolve([])),
    "Params",
    [addr, m?.assetDecimals],
  )

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
                  fontWeight: tab === "Markets" ? 600 : 400,
                  color: tab === "Markets" ? T.text : T.textDim,
                  padding: "6px 14px",
                  borderRadius: T.radiusSm,
                  background:
                    tab === "Markets" ? `${T.accent}12` : "transparent",
                  cursor: "pointer",
                }}
              >
                {tab}
              </span>
            ))}
          </div>
        </div>
        <div
          style={{
            fontFamily: T.fontMono,
            fontSize: "11px",
            color: T.textDim,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span style={{ cursor: "pointer" }}>markets</span>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: T.textMuted }}>
            {m?.name || truncAddr(addr)}
          </span>
        </div>
      </nav>

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
        {/* Section 1: Header — always renders (has own loading/error) */}
        <section>
          <MarketHeaderSection addr={addr} />
        </section>

        {/* Remaining sections wait for header to resolve so they have assetDecimals etc. */}
        {m && (
          <>
            <section>
              <SectionHeader
                title="Market Size"
                subtitle="Total debt trajectory with parameter change markers"
              />
              <div style={{ marginTop: "12px" }}>
                <DebtChartSection
                  addr={addr}
                  dec={m.assetDecimals}
                  paramChanges={paramState.data}
                />
              </div>
            </section>
            <section>
              <SectionHeader
                title="Parameter Change History"
                subtitle="All borrower-initiated changes to market terms"
              />
              <div style={{ marginTop: "12px" }}>
                {paramState.loading ? (
                  <SectionSkeleton height={120} label="Loading parameters..." />
                ) : paramState.error ? (
                  <SectionError label="Parameters" error={paramState.error} />
                ) : (
                  <ParameterHistorySection addr={addr} dec={m.assetDecimals} />
                )}
              </div>
            </section>
            <section>
              <SectionHeader
                title="Deposits & Withdrawals"
                subtitle="Daily fund flows and cumulative net position"
              />
              <div style={{ marginTop: "12px" }}>
                <DepositsWithdrawalsSection addr={addr} dec={m.assetDecimals} />
              </div>
            </section>
            <section>
              <SectionHeader
                title="Delinquency History"
                subtitle="Every delinquency event — frequency, severity, and cure time"
              />
              <div style={{ marginTop: "12px" }}>
                <DelinquencySection
                  addr={addr}
                  gracePeriodSec={m.gracePeriodSeconds}
                  gracePeriodHours={m.gracePeriodHours}
                />
              </div>
            </section>
            <section>
              <SectionHeader
                title="Withdrawal Processing"
                subtitle="Batch payment history and current pending queue"
              />
              <div style={{ marginTop: "12px" }}>
                <WithdrawalBatchSection
                  addr={addr}
                  dec={m.assetDecimals}
                  symbol={m.assetSymbol}
                  isStablecoin={m.isStablecoin}
                />
              </div>
            </section>
            <section>
              <SectionHeader
                title="Interest & Fees"
                subtitle="Cumulative cost breakdown — base interest, penalty fees, and protocol fees"
              />
              <div style={{ marginTop: "12px" }}>
                <InterestSection addr={addr} dec={m.assetDecimals} market={m} />
              </div>
            </section>
            <section>
              <SectionHeader
                title="Market Token Transfers"
                subtitle="Secondary market activity — direct token transfers"
              />
              <div style={{ marginTop: "12px" }}>
                <TransferSection addr={addr} dec={m.assetDecimals} />
              </div>
            </section>
            <section>
              <SectionHeader
                title="Lenders"
                subtitle="All lender positions — click any row to view full portfolio"
              />
              <div style={{ marginTop: "12px" }}>
                <LenderTableSection
                  addr={addr}
                  sf={m.scaleFactor}
                  dec={m.assetDecimals}
                  totalDebt={m.totalDebt}
                />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
