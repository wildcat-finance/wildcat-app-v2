import * as React from "react"

import Link from "next/link"

import { ROUTES } from "@/routes"

import styles from "./analytics.module.css"
import type { BorrowerAnalytics, MarketAnalytics, Publication } from "./api"
import { borrowerSpecs } from "./borrowerSpecs"
import { AnalyticsCardRow, CardSpec, VerdictChip } from "./card"
import { AnalyticsFrame } from "./Frame"
import { isoDay, lifecycle, reader } from "./helpers"
import { marketSpecs } from "./marketSpecs"
import { Tone } from "./rules"
import { CARDS } from "./wording"

export const MarketAnalyticsFrame = ({
  publication,
  closed,
  children,
}: {
  publication?: Publication
  closed?: boolean
  children: React.ReactNode
}) => (
  <AnalyticsFrame
    title="Market analytics"
    publication={publication}
    labels={closed ? ["Finished · history frozen"] : []}
  >
    {children}
  </AnalyticsFrame>
)

const Id = ({ children }: { children: string }) => (
  <span className={styles.id}>{children}</span>
)

// The operator strip names each line by its headline ids, as the design does.
const OPERATOR_IDS: Record<string, string> = {
  "3.1": "S05 · D21 · S28",
  "3.4": "S36/S18 (S35)",
  "3.6": "S30/S31/S32",
  "3.8": "S12 · S13 · D15",
  "3.10": "S37",
}
const TONE_CHIP: Record<Tone, string> = {
  green: styles.verdictStrong,
  amber: styles.verdictWatch,
  red: styles.verdictProblem,
  neutral: styles.verdictLimited,
}
const TONE_TEXT: Record<Tone, string> = {
  green: styles.stateGreen,
  amber: styles.stateAmber,
  red: styles.stateRed,
  neutral: styles.stateNeutral,
}

/** Every line carries a chip: its verdict, its state, or NEUTRAL. */
const OperatorChip = ({ spec }: { spec: CardSpec }) => {
  if (spec.verdict) return <VerdictChip verdict={spec.verdict} />
  const tone = spec.kind === "state" ? spec.state ?? "neutral" : "neutral"
  return (
    <span className={`${styles.verdict} ${TONE_CHIP[tone]}`}>
      {spec.kind === "state" && tone !== "neutral"
        ? tone.toUpperCase()
        : "NEUTRAL"}
    </span>
  )
}

/** The operator strip: the borrower's book lines, linking to their analytics. */
const Operator = ({
  market,
  borrower,
  borrowerName,
  message,
}: {
  market: MarketAnalytics
  borrower?: BorrowerAnalytics
  borrowerName?: string
  message: string
}) => {
  const address = market.flags.borrower
  if (!address) return null
  const lines = borrower && !borrower.partial ? borrowerSpecs(borrower) : []
  return (
    <section className={styles.box} aria-label="The operator">
      <div className={styles.boxHead}>
        <h3 className={styles.boxTitle}>
          The operator: {borrowerName ?? address}
        </h3>
        <Link
          className={styles.boxLink}
          href={`${ROUTES.lender.profile}/${address}?chainId=${market.market.chainId}#analytics`}
        >
          Full borrower analytics →
        </Link>
      </div>
      {lines.length ? (
        lines.map((spec) => (
          <div key={spec.id} className={styles.operatorRow}>
            <span className={styles.operatorName}>
              {CARDS[spec.id].name} <Id>{OPERATOR_IDS[spec.id] ?? spec.ids}</Id>
            </span>
            <span
              className={`${styles.operatorValue} ${
                spec.kind === "state" ? TONE_TEXT[spec.state ?? "neutral"] : ""
              }`}
            >
              {spec.value}
              {spec.sub ? <span> · {spec.sub}</span> : null}
            </span>
            <span className={styles.operatorChip}>
              <OperatorChip spec={spec} />
            </span>
          </div>
        ))
      ) : (
        <p className={styles.note} role="status">
          {message}
        </p>
      )}
    </section>
  )
}

export const MarketDashboard = ({
  market,
  borrower,
  comparisonUnavailable,
  typeLabels,
  borrowerName,
  borrowerLoading,
}: {
  market: MarketAnalytics
  borrower?: BorrowerAnalytics
  comparisonUnavailable?: boolean
  borrowerLoading?: boolean
  /** Market type labels (G4), from the market's hooks and app data. */
  typeLabels?: string[]
  borrowerName?: string
}) => {
  const { rowA, supporting, banner } = marketSpecs(market, borrower, typeLabels)
  const { s } = reader(market.values)
  const status = lifecycle(s("M77"))
  const address = market.flags.borrower
  let message = "Borrower comparison unavailable."
  if (borrowerLoading) message = "Loading the borrower record…"
  else if (borrower?.partial)
    message = "Borrower totals exclude markets whose data is unavailable."
  else if (comparisonUnavailable)
    message = "Borrower comparisons are unavailable for this snapshot."
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h3 className={styles.headerTitle}>
            {market.market.symbol ?? s("M01") ?? "Market"}
          </h3>
          <Id>M01</Id>
          {market.market.name ? (
            <span className={styles.headerName}>{market.market.name}</span>
          ) : null}
          {s("M02") ? (
            <>
              <span className={`${styles.badge} ${styles.badgeAsset}`}>
                {s("M02")}
              </span>
              <Id>M02</Id>
            </>
          ) : null}
          <span
            className={`${styles.badge} ${
              status === "Open" ? styles.badgeOpen : ""
            }`}
          >
            {status}
          </span>
          <Id>M77</Id>
        </div>
        <div className={styles.headerRow}>
          {address ? (
            <Link
              className={`${styles.badge} ${styles.badgeLink}`}
              href={`${ROUTES.lender.profile}/${address}?chainId=${market.market.chainId}#analytics`}
            >
              <span className={styles.dot} aria-hidden="true" />
              {borrowerName ?? `${address.slice(0, 6)}…${address.slice(-4)}`} →
            </Link>
          ) : null}
          {typeLabels?.map((label) => (
            <span key={label} className={styles.badge}>
              {label}
            </span>
          ))}
          {typeLabels?.length ? <Id>G4</Id> : null}
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.headerFact}>
            deployed <b>{isoDay(s("M03"))}</b> <Id>M03</Id>
          </span>
        </div>
      </header>
      <AnalyticsCardRow specs={rowA} initialOpen="2.1" label="Market cards" />
      {banner ? (
        <div className={styles.banner} role="note">
          ⚠ {banner} <Id>M18 vs S06/S07</Id>
        </div>
      ) : null}
      <Operator
        market={market}
        borrower={borrower}
        borrowerName={borrowerName}
        message={message}
      />
      <p className={styles.sectionLabel}>
        Supporting detail
        <span>collapsed by default · click any card for its seven fields</span>
      </p>
      <AnalyticsCardRow
        specs={supporting}
        columns={4}
        label="Supporting cards"
      />
    </div>
  )
}
