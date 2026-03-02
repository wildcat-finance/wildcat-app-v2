"use client"

import { useMemo } from "react"

import { useParams } from "next/navigation"

import { AggregateDebtSection } from "./components/AggregateDebtSection"
import { BorrowerHeaderSection } from "./components/BorrowerHeaderSection"
import { DelinquencyTrackRecordSection } from "./components/DelinquencyTrackRecordSection"
import { InterestCostSection } from "./components/InterestCostSection"
import { LenderOverlapSection } from "./components/LenderOverlapSection"
import { MarketsTableSection } from "./components/MarketsTableSection"
import { ParameterHistorySection } from "./components/ParameterHistorySection"
import { WithdrawalRecordSection } from "./components/WithdrawalRecordSection"
import { fetchBorrowerMarkets } from "./hooks/queries"
import { SectionError } from "../../components/SectionError"
import { SectionHeader } from "../../components/SectionHeader"
import { SectionSkeleton } from "../../components/SectionSkeleton"
import { T, truncAddr } from "../../constants"
import { useSubgraphQuery } from "../../hooks/useSubgraphQuery"

export default function BorrowerProfilePage() {
  const params = useParams()
  const addr = (params?.address as string) ?? ""

  const { data, loading, error } = useSubgraphQuery(
    () => fetchBorrowerMarkets(addr),
    "BorrowerPage",
    [addr],
  )

  const { marketIds, decimalsMap, sfMap, gracePeriodMap, nameMap, priceMap } =
    useMemo(() => {
      if (!data) {
        return {
          marketIds: [] as string[],
          decimalsMap: {} as Record<string, number>,
          sfMap: {} as Record<string, string>,
          gracePeriodMap: {} as Record<string, number>,
          nameMap: {} as Record<string, string>,
          priceMap: {} as Record<string, number>,
        }
      }
      const ids = data.markets.map((m) => m.id)
      const dec: Record<string, number> = {}
      const sf: Record<string, string> = {}
      const gp: Record<string, number> = {}
      const nm: Record<string, string> = {}
      data.markets.forEach((m) => {
        dec[m.id] = m.decimals
        sf[m.id] = m.scaleFactor
        gp[m.id] = m.gracePeriodSec
        nm[m.id] = m.name
      })
      return {
        marketIds: ids,
        decimalsMap: dec,
        sfMap: sf,
        gracePeriodMap: gp,
        nameMap: nm,
        priceMap: data.priceMap,
      }
    }, [data])

  const hasData = !loading && !error && data && data.markets.length > 0

  return (
    <div
      style={{
        background: T.bg,
        minHeight: "100vh",
        color: T.text,
        fontFamily: T.fontBody,
      }}
    >
      {/* Nav */}
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
                  fontWeight: tab === "Borrowers" ? 600 : 400,
                  color: tab === "Borrowers" ? T.text : T.textDim,
                  padding: "6px 14px",
                  borderRadius: T.radiusSm,
                  background:
                    tab === "Borrowers" ? `${T.accent}12` : "transparent",
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
          <span style={{ cursor: "pointer" }}>borrowers</span>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: T.textMuted }}>{truncAddr(addr)}</span>
        </div>
      </nav>

      {/* Content */}
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
        {/* 1: Identity & portfolio */}
        <section>
          <SectionHeader
            title="Borrower Profile"
            subtitle="Portfolio overview and reliability signals for lender due diligence"
          />
          <div style={{ marginTop: "12px" }}>
            <BorrowerHeaderSection addr={addr} />
          </div>
        </section>

        {/* Loading / error state for top-level data */}
        {loading && <SectionSkeleton height={100} label="Loading markets..." />}
        {error && <SectionError label="Borrower data" error={error} />}

        {hasData && (
          <>
            {/* 2: Markets table */}
            <section>
              <SectionHeader
                title="Markets"
                subtitle="All markets deployed by this borrower — click any row to view market detail"
              />
              <div style={{ marginTop: "12px" }}>
                <MarketsTableSection markets={data.markets} />
              </div>
            </section>

            {/* 3: Aggregate debt */}
            <section>
              <SectionHeader
                title="Aggregate Debt"
                subtitle="Total debt trajectory across all markets — stacked to show relative weight"
              />
              <div style={{ marginTop: "12px" }}>
                <AggregateDebtSection
                  marketIds={marketIds}
                  nameMap={nameMap}
                  priceMap={priceMap}
                />
              </div>
            </section>

            {/* 4: Delinquency track record */}
            <section>
              <SectionHeader
                title="Delinquency Track Record"
                subtitle="Every delinquency event across all markets — the key risk signal for lenders"
              />
              <div style={{ marginTop: "12px" }}>
                <DelinquencyTrackRecordSection
                  marketIds={marketIds}
                  gracePeriodMap={gracePeriodMap}
                  nameMap={nameMap}
                />
              </div>
            </section>

            {/* 5: Withdrawal processing */}
            <section>
              <SectionHeader
                title="Withdrawal Processing"
                subtitle="Aggregate batch payment history — do lenders get their money back on time?"
              />
              <div style={{ marginTop: "12px" }}>
                <WithdrawalRecordSection
                  marketIds={marketIds}
                  decimalsMap={decimalsMap}
                  nameMap={nameMap}
                  priceMap={priceMap}
                />
              </div>
            </section>

            {/* 6: Interest & cost */}
            <section>
              <SectionHeader
                title="Interest & Borrower Cost"
                subtitle="Total cost of capital — interest, penalty fees, and protocol fees"
              />
              <div style={{ marginTop: "12px" }}>
                <InterestCostSection
                  marketIds={marketIds}
                  priceMap={priceMap}
                  profile={data.profile}
                />
              </div>
            </section>

            {/* 7: Parameter changes */}
            <section>
              <SectionHeader
                title="Parameter Change History"
                subtitle="All borrower-initiated changes — stability of terms is a trust signal"
              />
              <div style={{ marginTop: "12px" }}>
                <ParameterHistorySection
                  marketIds={marketIds}
                  decimalsMap={decimalsMap}
                  nameMap={nameMap}
                  priceMap={priceMap}
                />
              </div>
            </section>

            {/* 8: Lender overlap */}
            <section>
              <SectionHeader
                title="Lender Relationships"
                subtitle="Lender overlap across markets — repeat lenders signal trust"
              />
              <div style={{ marginTop: "12px" }}>
                <LenderOverlapSection
                  marketIds={marketIds}
                  decimalsMap={decimalsMap}
                  sfMap={sfMap}
                  priceMap={priceMap}
                  totalDebt={data.profile.totalDebt}
                />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
