import * as React from "react"
import { useState } from "react"

import Link from "next/link"

import { ROUTES } from "@/routes"

import styles from "./analytics.module.css"
import {
  BorrowerAnalytics as BorrowerData,
  BorrowerMarketRow,
  useBorrowerAnalytics,
} from "./api"
import { borrowerSpecs, lateShareRows, marketLabel } from "./borrowerSpecs"
import { AnalyticsCardRow, VerdictChip } from "./card"
import { LateShareBars, Tbd } from "./charts"
import {
  apr,
  BLANK,
  compactUnits,
  count,
  percent,
  plural,
  score,
  units,
} from "./format"
import { AnalyticsSkeleton, AnalyticsFrame, Notice } from "./Frame"
import { isFunded, isoDay, reader } from "./helpers"
import { Tone, verdictExits, verdictInOrder } from "./rules"

const NA = BLANK.unavailable
const cx = (...names: (string | false | undefined)[]) =>
  names.filter(Boolean).join(" ")
const TONE_CLASS: Record<Tone, string> = {
  green: styles.stateGreen,
  amber: styles.stateAmber,
  red: styles.stateRed,
  neutral: styles.stateNeutral,
}

const Id = ({ children }: { children: string }) => (
  <span className={styles.id}>{children}</span>
)

/** Right now for one market row (M21 / M85), in the spec's words. */
export const marketState = (
  row: BorrowerMarketRow,
): { word: string; tone: Tone } => {
  if (row.state !== "Ok")
    return {
      word: row.state === "Preparing" ? "preparing" : "under review",
      tone: "neutral",
    }
  if (row.values.M77 === "Closed") return { word: "finished", tone: "neutral" }
  if (row.values.M85 === 1) return { word: "past allowance", tone: "red" }
  if (row.values.M21 === 1)
    return { word: "late, within allowance", tone: "amber" }
  if (row.values.M21 === 0 && row.values.M85 === 0)
    return { word: "in order", tone: "green" }
  return { word: NA, tone: "neutral" }
}

const COLUMNS: [string, string][] = [
  ["Market", ""],
  ["In order, cash there", "M18"],
  ["Exits paid on time", "M32 of M30"],
  ["Right now", "M21 / M85"],
  ["Total owed to lenders now", "M07"],
  ["Base APR now", "M11"],
]

/** Weakest funded open market first; finished, unfunded and unknown rows last. */
const tableOrder = (rows: BorrowerMarketRow[]) => {
  const place = (row: BorrowerMarketRow) => {
    if (row.state !== "Ok" || !isFunded(row.values)) return 3
    if (row.values.M77 === "Closed") return 2
    return (reader(row.values).n("H01") ?? 0) > 0 ? 0 : 1
  }
  const grade = (row: BorrowerMarketRow) =>
    reader(row.values).n("M18") ?? Number.POSITIVE_INFINITY
  return [...rows].sort(
    (left, right) => place(left) - place(right) || grade(left) - grade(right),
  )
}

const MarketRow = ({
  row,
  chainId,
}: {
  row: BorrowerMarketRow
  chainId: number
}) => {
  const { n, s } = reader(row.values)
  const ok = row.state === "Ok"
  const funded = isFunded(row.values)
  const closed = row.values.M77 === "Closed"
  const life = n("H01")
  const grade = n("M18")
  const deadlines = n("M30")
  const exits = n("M32")
  const state = marketState(row)
  const owed = n("M07")
  const asset = s("M02")
  const stale = (n("M80") ?? 0) > 24 && owed !== undefined && owed > 0
  const verdict =
    ok && funded && life && grade !== undefined && !closed
      ? verdictInOrder({ score: grade, trend: n("M68"), days: n("M05"), stale })
      : null
  let inOrder: React.ReactNode = NA
  if (ok && n("M49") === 0) inOrder = "not funded yet"
  else if (ok && life === 0) inOrder = "no recorded history"
  else if (ok && life && n("H02") === 0) inOrder = BLANK.neverLate
  else if (ok && grade !== undefined)
    inOrder = (
      <span className={styles.cell}>
        <span className={styles.score}>{score(grade)}</span>
        {verdict ? <VerdictChip verdict={verdict} /> : null}
      </span>
    )
  let exitText: React.ReactNode = NA
  if (ok && deadlines === 0) exitText = BLANK.noExits
  else if (ok && deadlines !== undefined && exits !== undefined)
    exitText = (
      <>
        {percent(exits)} of {count(deadlines)}
        {verdictExits({ pct: exits, deadlines }) === "LIMITED" ? (
          <span className={styles.thin}>thin history</span>
        ) : null}
      </>
    )
  let owedText: React.ReactNode = NA
  if (ok && closed)
    owedText = (
      <span
        className={styles.muted}
        title={owed === undefined ? undefined : `${units(owed)} ${asset ?? ""}`}
      >
        finished
      </span>
    )
  else if (ok && owed !== undefined)
    owedText = `${compactUnits(owed)}${asset ? ` ${asset}` : ""}`
  let rateText: React.ReactNode = NA
  if (ok && closed) rateText = <span className={styles.muted}>finished</span>
  else if (ok && n("M11") !== undefined) rateText = apr(n("M11")!)
  const cells: [string, React.ReactNode][] = [
    [COLUMNS[1][0], inOrder],
    [COLUMNS[2][0], exitText],
    [
      COLUMNS[3][0],
      <span
        key="state"
        className={cx(styles.stateWord, TONE_CLASS[state.tone])}
      >
        {state.word}
      </span>,
    ],
    [COLUMNS[4][0], owedText],
    [COLUMNS[5][0], rateText],
  ]
  return (
    <tr>
      <th scope="row">
        <Link
          href={`${ROUTES.lender.market}/${row.address}?chainId=${chainId}`}
          title={row.name ?? row.address}
        >
          {marketLabel(row)} →
        </Link>
      </th>
      {cells.map(([label, value]) => (
        <td key={label} data-label={label}>
          {value}
        </td>
      ))}
    </tr>
  )
}

const MarketsTable = ({ borrower }: { borrower: BorrowerData }) => (
  <section className={styles.box} aria-label="Per-market table">
    <div className={cx(styles.boxHead, styles.boxHeadStart)}>
      <h3 className={styles.boxTitle}>Per-market table</h3>
      <span className={styles.footnote} style={{ margin: 0 }}>
        find the weak link the averages hide; each row links to its market
      </span>
    </div>
    <div className={styles.tableWrap}>
      <table className={styles.table} aria-label="Borrower markets">
        <thead>
          <tr>
            {COLUMNS.map(([label, id]) => (
              <th key={label} scope="col">
                {label}
                {id ? <Id>{id}</Id> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableOrder(borrower.markets).map((row) => (
            <MarketRow
              key={row.address}
              row={row}
              chainId={borrower.borrower.chainId}
            />
          ))}
        </tbody>
      </table>
    </div>
    <p className={styles.footnote}>
      Weakest market first. Blanks are words, never 0 or 100. Verdicts follow
      the rules of cards 2.1 and 2.3.
    </p>
  </section>
)

/** Card 3.12: concentration by market, and the direction of the book. */
const Trouble = ({ borrower }: { borrower: BorrowerData }) => {
  const [view, setView] = useState<"concentration" | "direction">(
    "concentration",
  )
  const rows = lateShareRows(borrower)
  return (
    <section className={styles.box} aria-label="Trouble over time">
      <div className={styles.boxHead}>
        <h3 className={styles.boxTitle}>
          Trouble over time <span className={styles.panelId}>3.12</span>{" "}
          <span className={styles.panelIds}>
            v1 H02 / H01 split by M26 · v2 rolling 90 d · D17
          </span>
        </h3>
        <div className={styles.views} role="group" aria-label="Trouble view">
          {(["concentration", "direction"] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={cx(styles.chip, view === key && styles.chipOn)}
              aria-pressed={view === key}
              onClick={() => setView(key)}
            >
              {key === "concentration" ? "Concentration" : "Direction"}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.lede}>
        rates, not lifetime totals, so age does not read as guilt
      </p>
      {view === "concentration" &&
        (rows.length ? (
          <LateShareBars rows={rows} />
        ) : (
          <Tbd>No funded market has recorded life yet.</Tbd>
        ))}
      {view === "direction" && (
        <Tbd>
          Direction (rolling 90-day share of book-days late): TBD. The series is
          not computed yet.
        </Tbd>
      )}
    </section>
  )
}

export const BorrowerAnalyticsView = ({
  borrower,
}: {
  borrower: BorrowerData
}) => {
  const { n, s } = reader(borrower.values)
  const marketDays = n("MARKET_DAYS")
  const markets = n("S01")
  const floor = marketDays ? n("S06") : undefined
  const top = marketDays ? n("S07") : undefined
  let spread: string = NA
  if (markets === 1) spread = "single market"
  else if (floor !== undefined && top !== undefined)
    spread = `${score(floor)} to ${score(top)}`
  let content = (
    <div className={styles.root}>
      {borrower.partial ? (
        <Notice compact>
          Totals exclude markets whose data is unavailable.
        </Notice>
      ) : null}
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <span className={styles.headerFact}>
            <b>{markets === undefined ? NA : count(markets)}</b>{" "}
            {markets === 1 ? "market" : "markets"} <Id>S01</Id>
          </span>
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.headerFact}>
            on Wildcat since <b>{isoDay(s("S02"))}</b> <Id>S02</Id>
          </span>
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.headerFact}>
            <b>
              {marketDays === undefined ? NA : plural(marketDays, "market-day")}
            </b>{" "}
            of evidence <Id>Σ M05</Id>
          </span>
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.headerFact}>
            spread <b>{spread}</b> <Id>S06 – S07</Id>
          </span>
        </div>
      </header>
      <AnalyticsCardRow
        specs={borrowerSpecs(borrower)}
        label="Borrower cards"
      />
      {borrower.markets.length ? (
        <MarketsTable borrower={borrower} />
      ) : (
        <Notice compact>No market records available.</Notice>
      )}
      <Trouble borrower={borrower} />
    </div>
  )
  if (borrower.state === "Preparing") {
    content = <Notice compact>Borrower analytics are being prepared.</Notice>
  } else if (
    borrower.state === "UnderReview" ||
    Object.keys(borrower.values).length === 0
  ) {
    content = <Notice compact>Borrower analytics are under review.</Notice>
  }
  return (
    <AnalyticsFrame
      title="Borrower analytics"
      publication={borrower.publication}
      labels={borrower.partial ? ["Partial record"] : []}
    >
      {content}
    </AnalyticsFrame>
  )
}

export const BorrowerAnalytics = ({
  chainId,
  address,
}: {
  chainId?: number
  address?: string
}) => {
  const borrower = useBorrowerAnalytics(chainId, address)
  let content: React.ReactNode
  if (!chainId || !address || borrower.isLoading) {
    content = <AnalyticsSkeleton cards={5} compact />
  } else if (borrower.isError || !borrower.data) {
    content = (
      <Notice
        compact
        onRetry={() => {
          borrower.refetch()
        }}
      >
        Analytics could not be loaded.
      </Notice>
    )
  } else if (borrower.data.status === "preparing") {
    content = <Notice compact>Borrower analytics are being prepared.</Notice>
  } else if (borrower.data.status === "unavailable") {
    content = (
      <Notice compact>
        Borrower analytics are unavailable on this network.
      </Notice>
    )
  } else {
    return <BorrowerAnalyticsView borrower={borrower.data.data} />
  }
  return <AnalyticsFrame title="Borrower analytics">{content}</AnalyticsFrame>
}
