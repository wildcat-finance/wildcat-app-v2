import * as React from "react"

import Link from "next/link"

import { ROUTES } from "@/routes"

import styles from "./analytics.module.css"
import {
  BorrowerAnalytics as BorrowerData,
  BorrowerMarketRow,
  useBorrowerAnalytics,
} from "./api"
import { borrowerSpecs, lateShareRows, marketLabel } from "./borrowerSpecs"
import { AnalyticsCardRow, CardSpec, VerdictChip } from "./card"
import { Direction, LateShareBars, Tbd } from "./charts"
import {
  apr,
  BLANK,
  compactUnits,
  count,
  counted,
  percent,
  range,
  score,
  units,
  withAsset,
} from "./format"
import { AnalyticsSkeleton, AnalyticsFrame, Notice } from "./Frame"
import { isFunded, isoDay, reader } from "./helpers"
import { Tone, verdictExits, verdictInOrder } from "./rules"
import { cardCopy, metricName, scoped } from "./text"

const p = scoped("pages.borrower")

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
      word:
        row.state === "Preparing"
          ? p("state.preparing")
          : p("state.underReview"),
      tone: "neutral",
    }
  if (row.values.M77 === "Closed")
    return { word: p("state.finished"), tone: "neutral" }
  if (!isFunded(row.values)) return { word: BLANK.notFunded, tone: "neutral" }
  if (row.values.M85 === 1) return { word: p("state.past"), tone: "red" }
  if (row.values.M21 === 1) return { word: p("state.within"), tone: "amber" }
  if (row.values.M21 === 0 && row.values.M85 === 0)
    return { word: p("state.inOrder"), tone: "green" }
  return { word: NA, tone: "neutral" }
}

// Each column is named by its metric (or card 2.4), so a rename in the file
// reaches the table too.
const COLUMNS: [string, string][] = [
  [p("table.market"), ""],
  [metricName("M18"), "M18"],
  [metricName("M32"), p("table.exitsIds")],
  [cardCopy("2.4").name, "M21 / M85"],
  [metricName("M07"), "M07"],
  [metricName("M11"), "M11"],
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
  if (ok && n("M49") === 0) inOrder = BLANK.notFunded
  else if (ok && life === 0) inOrder = BLANK.noHistory
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
        {p("table.exits", {
          share: percent(exits),
          deadlines: count(deadlines),
        })}
        {verdictExits({ pct: exits, deadlines }) === "LIMITED" ? (
          <span className={styles.thin}>{p("table.thin")}</span>
        ) : null}
      </>
    )
  let owedText: React.ReactNode = NA
  if (ok && closed)
    owedText = (
      <span
        className={styles.muted}
        title={owed === undefined ? undefined : withAsset(units(owed), asset)}
      >
        {p("table.finished")}
      </span>
    )
  else if (ok && owed !== undefined)
    owedText = withAsset(compactUnits(owed), asset)
  let rateText: React.ReactNode = NA
  if (ok && closed)
    rateText = <span className={styles.muted}>{p("table.finished")}</span>
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
  <section className={styles.box} aria-label={p("table.label")}>
    <div className={cx(styles.boxHead, styles.boxHeadStart)}>
      <h3 className={styles.boxTitle}>{p("table.label")}</h3>
      <span className={styles.footnote} style={{ margin: 0 }}>
        {p("table.hint")}
      </span>
    </div>
    <div className={styles.tableWrap}>
      <table className={styles.table} aria-label={p("table.tableLabel")}>
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
    <p className={styles.footnote}>{p("table.footnote")}</p>
  </section>
)

/** Card 3.12: concentration by market beside the direction of the book. */
const Trouble = ({ borrower }: { borrower: BorrowerData }) => {
  const rows = lateShareRows(borrower)
  return (
    <section className={styles.box} aria-label={p("trouble.title")}>
      <div className={styles.boxHead}>
        <h3 className={styles.boxTitle}>
          {p("trouble.title")} <span className={styles.panelId}>3.12</span>{" "}
          <span className={styles.panelIds}>{p("trouble.ids")}</span>
        </h3>
      </div>
      <p className={styles.lede}>{p("trouble.lede")}</p>
      <div className={styles.troubleViews}>
        <div aria-label={p("trouble.concentration")} role="group">
          {rows.length ? (
            <LateShareBars rows={rows} />
          ) : (
            <Tbd>{p("trouble.noLife")}</Tbd>
          )}
        </div>
        <div aria-label={p("trouble.direction")} role="group">
          <Direction series={borrower.values.LATE_SHARE_90D} />
        </div>
      </div>
    </section>
  )
}

export const BorrowerAnalyticsView = ({
  borrower,
  renderCards,
}: {
  borrower: BorrowerData
  /** Review previews can render chosen specimens in the live page layout. */
  renderCards?: (
    specs: CardSpec[],
    label: string,
    columns: number,
  ) => React.ReactNode
}) => {
  const { n, s } = reader(borrower.values)
  const marketDays = n("MARKET_DAYS")
  const markets = n("S01")
  const floor = marketDays ? n("S06") : undefined
  const top = marketDays ? n("S07") : undefined
  let spread: string = NA
  if (markets === 0) spread = BLANK.noFundedMarket
  else if (markets === 1) spread = p("header.singleMarket")
  else if (floor !== undefined && top !== undefined)
    spread = range(score(floor), score(top))
  let content = (
    <div className={styles.root}>
      {borrower.partial ? <Notice compact>{p("notice.partial")}</Notice> : null}
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <span className={styles.headerFact}>
            <b>{markets === undefined ? NA : count(markets)}</b>{" "}
            {p("header.markets", { count: markets ?? 0 })} <Id>S01</Id>
          </span>
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.headerFact}>
            {p("header.since")} <b>{isoDay(s("S02"))}</b> <Id>S02</Id>
          </span>
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.headerFact}>
            <b>
              {marketDays === undefined ? NA : counted("marketDay", marketDays)}
            </b>{" "}
            {p("header.evidence")} <Id>Σ M05</Id>
          </span>
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.headerFact}>
            {p("header.spread")} <b>{spread}</b> <Id>S06 – S07</Id>
          </span>
        </div>
      </header>
      {renderCards ? (
        renderCards(borrowerSpecs(borrower), p("cardsLabel"), 5)
      ) : (
        <AnalyticsCardRow
          specs={borrowerSpecs(borrower)}
          initialOpen="3.1"
          label={p("cardsLabel")}
        />
      )}
      {borrower.markets.length ? (
        <MarketsTable borrower={borrower} />
      ) : (
        <Notice compact>{p("notice.noMarkets")}</Notice>
      )}
      <Trouble borrower={borrower} />
    </div>
  )
  if (borrower.state === "Preparing") {
    content = <Notice compact>{p("notice.preparing")}</Notice>
  } else if (
    borrower.state === "UnderReview" ||
    Object.keys(borrower.values).length === 0
  ) {
    content = <Notice compact>{p("notice.underReview")}</Notice>
  }
  return (
    <AnalyticsFrame
      title={p("title")}
      publication={borrower.publication}
      labels={borrower.partial ? [p("partialLabel")] : []}
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
        {p("notice.failed")}
      </Notice>
    )
  } else if (borrower.data.status === "preparing") {
    content = <Notice compact>{p("notice.preparing")}</Notice>
  } else if (borrower.data.status === "unavailable") {
    content = <Notice compact>{p("notice.unavailable")}</Notice>
  } else {
    return <BorrowerAnalyticsView borrower={borrower.data.data} />
  }
  return <AnalyticsFrame title={p("title")}>{content}</AnalyticsFrame>
}
