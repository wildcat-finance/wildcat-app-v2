import * as React from "react"

import { BorrowerAnalytics, Comparison, MarketAnalytics } from "./api"
import { borrowerNow } from "./borrowerSpecs"
import { CardSpec } from "./card"
import {
  C,
  FillBar,
  HATCH,
  Histogram,
  IncidentRow,
  MARK_LIMIT,
  MarkArray,
  RankStrip,
  StackedBar,
  StateBox,
  StateRow,
  Tbd,
  ThresholdSliver,
  TrendPair,
  TwoLensesBar,
  WorstIncidentBars,
} from "./charts"
import {
  ageDays,
  apr,
  BLANK,
  contractKept,
  count,
  days,
  hours,
  isNumber,
  lifeShare,
  percent,
  plural,
  score,
  trend,
  units,
} from "./format"
import {
  cycleStatus,
  isFunded,
  isoDay,
  leadingNumber,
  lifecycle,
  openEpisodes,
  ordinal,
  rankPhrase,
  reader,
  sentence,
  yesNo,
} from "./helpers"
import {
  LIMITED_NOTE,
  penaltyChip,
  Tone,
  Verdict,
  verdictExits,
  verdictInOrder,
  verdictWorstIncident,
} from "./rules"
import { BREACH_RECOUNT } from "./wording"

const DAY = 86_400
const NA = BLANK.unavailable
const NO_BOOK = "TBD: no complete borrower record from the same snapshot"
const SINGLE_MARKET = "single-market borrower — no spread to show"
const join = (...parts: (string | false | undefined)[]) =>
  parts.filter(Boolean).join(" · ")
/** A LIMITED verdict always carries its note. */
const limited = (verdict: Verdict | null, sub: string) =>
  verdict === "LIMITED" ? join(sub, LIMITED_NOTE) : sub

/** The borrower record from the same publication, when it is complete. */
export const sameBook = (
  market: MarketAnalytics,
  borrower?: BorrowerAnalytics,
) =>
  borrower &&
  !borrower.partial &&
  borrower.state === "Ok" &&
  market.state === "Ok" &&
  borrower.publication.id === market.publication.id &&
  borrower.borrower.chainId === market.market.chainId &&
  borrower.publication.cut?.hash === market.publication.cut?.hash
    ? borrower
    : undefined

/** The borrower's funded markets that carry a grade, as the book counts them. */
const fundedGrades = (book: BorrowerAnalytics) =>
  book.markets
    .filter(
      (row) =>
        row.state === "Ok" &&
        isFunded(row.values) &&
        reader(row.values).n("H01") !== 0 &&
        isNumber(row.values.M18),
    )
    .map((row) => ({
      address: row.address.toLowerCase(),
      grade: Number(row.values.M18),
    }))

/** This market among the borrower's funded markets by M18; ties share a place. */
export function borrowerPosition(
  market: MarketAnalytics,
  borrower?: BorrowerAnalytics,
) {
  const book = sameBook(market, borrower)
  if (!book) return undefined
  const grades = fundedGrades(book)
  const own = grades.find(
    (row) => row.address === market.market.address.toLowerCase(),
  )
  if (!own || grades.length < 2) return undefined
  const min = Math.min(...grades.map((row) => row.grade))
  const max = Math.max(...grades.map((row) => row.grade))
  const tied = grades.filter((row) => row.grade === own.grade).length > 1
  const rank = grades.filter((row) => row.grade > own.grade).length + 1
  let word = `${ordinal(rank)} strongest`
  if (own.grade === max) word = "strongest"
  else if (own.grade === min) word = "weakest"
  if (tied) word = `joint ${word}`
  return { count: grades.length, min, max, word }
}

const rank = (comparison: Comparison | undefined, noun: string) =>
  comparison?.betterThan === undefined ? undefined : (
    <RankStrip
      position={comparison.betterThan}
      population={comparison.population}
      label={`Better than ${count(comparison.betterThan)} of ${count(
        comparison.population,
      )} graded ${noun}`}
    />
  )

export function marketSpecs(
  market: MarketAnalytics,
  borrower?: BorrowerAnalytics,
  /** Market type labels (G4), from the market's hooks and app data. */
  typeLabels?: string[],
) {
  const { n, s } = reader(market.values)
  const cmp = market.comparisons
  const { protocol } = market
  const book = sameBook(market, borrower)
  const bookValues = book ? reader(book.values) : undefined
  const singleMarket = book !== undefined && fundedGrades(book).length < 2
  const position = borrowerPosition(market, borrower)
  const asset = s("M02")
  const amount = (value?: number) =>
    value === undefined ? NA : `${units(value)}${asset ? ` ${asset}` : ""}`
  const show = <T,>(value: T | undefined, format: (value: T) => string) =>
    value === undefined ? NA : format(value)

  const life = n("H01")
  const late = n("H02")
  const cash = n("M18")
  const age = n("M05")
  const grace = n("M15")
  const hasRecord = life !== undefined && life > 0
  const penalty = hasRecord ? n("M26") : undefined
  const kept = penalty === undefined ? undefined : 100 - penalty
  const neverLate = hasRecord && late === 0
  const finished = n("M20")
  const open = openEpisodes(market.values)
  const episodes = finished === undefined ? undefined : finished + open
  const quiet = n("M80")
  const owed = n("M07")
  const stale =
    quiet !== undefined && quiet > 24 && owed !== undefined && owed > 0
  const closed = s("M77") === "Closed"
  const trailing = n("M67")
  const change = n("M68")
  const lateNow = n("M21")
  const pastNow = n("M85")
  // A finished market's grades are frozen at closure, not live verdicts.
  const frozen = closed
    ? `frozen at closure${
        age === undefined ? "" : ` · ${plural(age, "day")} recorded`
      }`
    : undefined
  const finishedFlag = closed
    ? { flag: "FINISHED", flagTone: "neutral" as const }
    : {}
  const borrowerChip = (text: string | undefined) => {
    if (singleMarket) return SINGLE_MARKET
    return text ?? NO_BOOK
  }

  // ---------- 2.1 In order ----------
  const graded = hasRecord && !neverLate && cash !== undefined
  let inOrderValue: string = NA
  if (life === 0) inOrderValue = "no recorded history"
  else if (neverLate) inOrderValue = BLANK.neverLate
  else if (graded) inOrderValue = score(cash)
  const inOrderVerdict =
    hasRecord && cash !== undefined && !closed
      ? verdictInOrder({ score: cash, trend: change, days: age, stale })
      : null
  let cashLine = `cash there (M18): ${NA}`
  if (neverLate)
    cashLine = "cash there (M18): never late, Delinquent seconds (H02) = 0"
  else if (hasRecord && late !== undefined && cash !== undefined)
    cashLine = `cash there (M18) = 100 × (1 − ${score(late / DAY)} / ${score(
      life / DAY,
    )}) = ${score(cash)}`
  const inOrder: CardSpec = {
    id: "2.1",
    page: "market",
    ids: "M18 · 100−M26 · M05 · M67 · M68 · M80 · M20 · H01 H02 H08 H09",
    kind: graded ? "score" : "text",
    value: inOrderValue,
    verdict: inOrderVerdict,
    ...(hasRecord ? finishedFlag : {}),
    sub: limited(
      inOrderVerdict,
      join(
        frozen,
        kept === undefined ? undefined : `contract kept: ${contractKept(kept)}`,
        stale && !closed ? `record silent ${hours(quiet!)}` : undefined,
      ),
    ),
    compare: cmp.M18
      ? `protocol medians: cash there ${score(cmp.M18.median)}${
          cmp.M26
            ? ` · contract kept ${contractKept(100 - cmp.M26.median)}`
            : ""
        }`
      : "",
    formula: [
      cashLine,
      penalty === undefined
        ? `contract kept: ${NA}`
        : `contract kept = 100 − Time under penalty (M26) ${score(
            penalty,
            2,
          )} = ${score(kept!, 2)}`,
      trailing !== undefined && cash !== undefined && change !== undefined
        ? `trend (M68) = In order, trailing 90 days (M67) ${score(
            trailing,
          )} − ${score(cash)} = ${trend(change)}`
        : `trend (M68): ${NA}`,
    ].join("\n"),
    numbers: sentence(
      `recorded life ${show(life, (v) => days(v / DAY))} (H01)`,
      `delinquent ${show(late, (v) =>
        days(v / DAY),
      )} (H02, quiet window included)`,
      `past allowance ${show(penalty, lifeShare)} (M26)`,
      `${show(episodes, (v) => plural(v, "episode"))}${
        open ? `, ${count(open)} still open` : ""
      } (M20)`,
      `age ${show(age, (v) => plural(v, "day"))} (M05)`,
      `quiet window ${show(quiet, hours)} (M80)`,
    ),
    chart: {
      expanded:
        hasRecord && cash !== undefined ? (
          <>
            <TwoLensesBar
              inOrder={cash}
              pastAllowance={penalty ?? 0}
              caption={`${score(
                life / DAY,
              )} recorded days · line 1 = green segment (M18) · line 2 = everything but red = 100 − M26`}
            />
            {trailing !== undefined && change !== undefined ? (
              <TrendPair
                lifetime={cash}
                trailing={trailing}
                caption={`difference ${trend(change)} = Trend (M68)`}
              />
            ) : null}
          </>
        ) : undefined,
    },
    chips: {
      median: cmp.M18
        ? `median ${score(cmp.M18.median)} · ${count(
            cmp.M18.population,
          )} graded markets`
        : "TBD: no protocol median yet",
      markets: rankPhrase(cmp.M18, "markets", age),
      borrower: borrowerChip(
        position
          ? `their ${count(position.count)} markets: ${score(
              position.min,
            )} to ${score(position.max)}; this market is the ${position.word}`
          : undefined,
      ),
    },
    chipCharts: { markets: rank(cmp.M18, "markets") },
  }

  // ---------- 2.2 Worst incident ----------
  const longest = n("M23")
  const worst =
    life !== 0 && grace !== undefined && grace > 0 ? n("M24") : undefined
  // The longest episode and the live state decide this, not the finished count.
  const noIncident =
    hasRecord &&
    open === 0 &&
    lateNow !== 1 &&
    pastNow !== 1 &&
    (longest === 0 || (longest === undefined && neverLate))
  let worstValue: string = NA
  if (noIncident) worstValue = BLANK.neverLate
  else if (grace === 0 && longest !== undefined) worstValue = hours(longest)
  else if (worst !== undefined) worstValue = percent(worst)
  let worstFormula = `worst incident (M24): ${NA}`
  if (noIncident)
    worstFormula =
      "No delinquency episode has been recorded: Longest episode (M23) = 0 h."
  else if (grace === 0)
    worstFormula =
      "Grace period (M15) is 0 h, so a share of the allowance is undefined."
  else if (worst !== undefined && longest !== undefined && grace !== undefined)
    worstFormula = `worst incident (M24) = 100 × Longest episode (M23) ${hours(
      longest,
    )} / Grace period (M15) ${hours(grace)} = ${percent(worst)}`
  const incidentRows: IncidentRow[] = []
  if (longest && grace && !noIncident)
    incidentRows.push({
      label: s("M01") ?? "this market",
      hours: longest,
      graceHours: grace,
    })
  book?.markets.forEach((row) => {
    const { n: value } = reader(row.values)
    if (
      row.address.toLowerCase() === market.market.address.toLowerCase() ||
      row.state !== "Ok" ||
      !isFunded(row.values) ||
      !value("M23") ||
      !value("M15")
    )
      return
    incidentRows.push({
      label: row.symbol ?? row.address.slice(0, 10),
      hours: value("M23")!,
      graceHours: value("M15")!,
    })
  })
  const bookLongest = bookValues?.n("D15")
  const worstVerdict =
    closed || grace === 0 ? null : verdictWorstIncident(noIncident ? 0 : worst)
  let worstSub = ""
  if (noIncident) worstSub = "no delinquency episode recorded"
  else if (grace === 0) worstSub = "no grace period to measure against"
  else if (worst !== undefined && worst > 100 && penalty === 0)
    worstSub =
      "of the allowed lateness · counted on the record; no penalty charged on chain"
  else if (worst !== undefined) worstSub = "of the allowed lateness"
  const worstIncident: CardSpec = {
    id: "2.2",
    page: "market",
    ids: "M24 = 100 × M23 / M15 · M25 · M83",
    kind: worst !== undefined && !noIncident ? "pct" : "text",
    value: worstValue,
    verdict: worstVerdict,
    ...(hasRecord ? finishedFlag : {}),
    sub: join(frozen, worstSub),
    compare: cmp.M24
      ? `median worst incident: ${percent(cmp.M24.median, 0)} of allowance`
      : "",
    formula: [
      worstFormula,
      `breaches = Grace breaches (M25): ${BREACH_RECOUNT}`,
      `cured in time = Cured within grace (M83): ${BREACH_RECOUNT}`,
    ].join("\n"),
    numbers: sentence(
      `longest episode ${show(longest, hours)} (M23)`,
      `allowance ${show(grace, hours)} (M15)`,
      `breaches TBD in ${show(episodes, (v) =>
        plural(v, "episode"),
      )} (M25, recount open, B2)`,
      "cured within grace TBD (M83, follows B2)",
    ),
    chart: {
      expanded: incidentRows.length ? (
        <WorstIncidentBars rows={incidentRows} />
      ) : undefined,
    },
    chips: {
      median: cmp.M24
        ? `median worst incident ${percent(
            cmp.M24.median,
            0,
          )} of allowance · ${count(cmp.M24.population)} graded markets`
        : "TBD: no protocol median yet",
      markets: rankPhrase(cmp.M24, "markets"),
      borrower: borrowerChip(
        bookLongest !== undefined
          ? `their book: longest episode ${hours(bookLongest * 24)}${
              longest !== undefined &&
              Math.abs(bookLongest * 24 - longest) < 0.05
                ? ", this market"
                : ""
            }`
          : undefined,
      ),
    },
    chipCharts: { markets: rank(cmp.M24, "markets") },
  }

  // ---------- 2.3 Exits paid on time ----------
  const deadlines = n("M30")
  const covered = n("M31")
  const rate = n("M32")
  const byMoney = n("M33")
  const paidLate = n("D18_LATE")
  const unpaid = n("D18_NEVER")
  const missed =
    deadlines !== undefined && covered !== undefined
      ? deadlines - covered
      : undefined
  const splitKnown =
    paidLate !== undefined &&
    unpaid !== undefined &&
    paidLate + unpaid === missed
  const held = n("M08")
  const unclaimed = n("M38")
  const out = n("M58")
  const borrowed = n("M56")
  const repaid = n("M57")
  const onHand =
    held !== undefined && unclaimed !== undefined ? held - unclaimed : undefined
  let exitFormula = `exits paid on time (M32): ${NA}`
  if (deadlines === 0)
    exitFormula =
      "Batches expired (M30) = 0: no withdrawal batch has reached its deadline."
  else if (
    deadlines !== undefined &&
    covered !== undefined &&
    rate !== undefined
  )
    exitFormula = `exits paid on time (M32) = 100 × Batches fully funded at expiry (M31) ${count(
      covered,
    )} / Batches expired (M30) ${count(deadlines)} = ${score(rate)}`
  const deadlineGroups =
    covered !== undefined && missed !== undefined && missed >= 0
      ? [
          {
            count: covered,
            color: C.fg2,
            label: "fully funded on the deadline (M31)",
          },
          ...(splitKnown
            ? [
                { count: paidLate!, color: HATCH, label: "paid late (D18)" },
                { count: unpaid!, color: C.red, label: "never paid (D18)" },
              ]
            : [
                {
                  count: missed,
                  color: HATCH,
                  label: "not covered on the day",
                },
              ]),
        ]
      : []
  // One mark per deadline below the counting limit, else one stacked bar.
  let deadlineChart: React.ReactNode = null
  if (deadlines && deadlineGroups.length)
    deadlineChart =
      deadlines <= MARK_LIMIT ? (
        <MarkArray
          groups={deadlineGroups}
          caption={`${count(
            covered!,
          )} dark = fully funded on the deadline (M31) · ${
            splitKnown
              ? `${count(paidLate!)} hatched = paid late, ${count(
                  unpaid!,
                )} red = never paid (D18)`
              : `${count(missed!)} hatched = not covered on the day`
          }`}
        />
      ) : (
        <StackedBar
          segments={deadlineGroups.map((group) => ({
            label: group.label,
            value: group.count,
            color: group.color === HATCH ? C.amber : group.color,
          }))}
          caption="payout deadlines (M30) by outcome"
        />
      )
  const exitVerdict = closed ? null : verdictExits({ pct: rate, deadlines })
  const exits: CardSpec = {
    id: "2.3",
    page: "market",
    ids: "M32 = 100 × M31 / M30 · M33 · D18 · M37 M38 · M58 = M56 − M57 · M08",
    kind: deadlines ? "pct" : "text",
    value:
      deadlines === 0
        ? BLANK.noExits
        : show(deadlines && rate !== undefined ? rate : undefined, percent),
    verdict: exitVerdict,
    ...(deadlines ? finishedFlag : {}),
    sub: limited(
      exitVerdict,
      join(
        frozen && deadlines ? frozen : undefined,
        deadlines ? `of ${plural(deadlines, "payout deadline")}` : undefined,
      ),
    ),
    compare:
      cmp.M32 && deadlines !== 0
        ? `protocol median: ${percent(cmp.M32.median)}`
        : "",
    formula: [
      exitFormula,
      ...(deadlines && byMoney !== undefined
        ? [`by money (M33) = ${score(byMoney)}`]
        : []),
      ...(missed && missed > 0
        ? [
            splitKnown
              ? `not covered = ${count(missed)} → paid late ${count(
                  paidLate!,
                )} / never paid ${count(unpaid!)} (D18)`
              : `not covered = ${count(missed)} → paid late / never paid: ${
                  BLANK.splitSoon
                } (D18)`,
          ]
        : []),
      borrowed !== undefined && repaid !== undefined && out !== undefined
        ? `out with the borrower (M58) = Lifetime borrowed (M56) ${units(
            borrowed,
          )} − Lifetime repaid (M57) ${units(repaid)} = ${units(out)}`
        : `out with the borrower (M58): ${NA}`,
    ].join("\n"),
    numbers: sentence(
      `open unpaid batches now ${show(n("M37"), count)} (M37)`,
      `unclaimed withdrawals reserved ${amount(unclaimed)} (M38)`,
      `assets held ${amount(held)} (M08)`,
      `on hand unreserved ${amount(onHand)} (M08 − M38)`,
      deadlines ? `by money ${show(byMoney, percent)} (M33)` : undefined,
    ),
    chart: {
      expanded: (
        <>
          {deadlineChart}
          {out !== undefined &&
          onHand !== undefined &&
          unclaimed !== undefined &&
          out >= 0 ? (
            <StackedBar
              segments={[
                {
                  label: "out with the borrower (M58)",
                  value: out,
                  color: C.fg2,
                },
                {
                  label: "on hand unreserved (M08 − M38)",
                  value: Math.max(0, onHand),
                  color: C.green,
                },
                {
                  label: "reserved for exits (M38)",
                  value: unclaimed,
                  color: C.blue,
                },
              ]}
              format={units}
              caption="where the money sits"
            />
          ) : null}
        </>
      ),
    },
    chips: {
      median: cmp.M32
        ? `median market: ${percent(
            cmp.M32.median,
          )} of deadlines funded on the day · ${count(
            cmp.M32.population,
          )} graded markets`
        : "TBD: no protocol median yet",
      markets: rankPhrase(cmp.M32, "markets"),
      borrower: borrowerChip(
        bookValues &&
          bookValues.n("S14") !== undefined &&
          bookValues.n("S15") !== undefined &&
          bookValues.n("S16") !== undefined
          ? `their book: ${count(bookValues.n("S15")!)} of ${plural(
              bookValues.n("S14")!,
              "deadline",
            )}, ${percent(bookValues.n("S16")!)}`
          : undefined,
      ),
    },
    chipCharts: { markets: rank(cmp.M32, "markets") },
  }

  // ---------- 2.4 Right now ----------
  const known = [0, 1].includes(lateNow!) && [0, 1].includes(pastNow!)
  const countdown = n("D05") ?? leadingNumber(s("D05"))
  const cured = n("M84")
  const waiting = n("M37")
  const exitsWaiting =
    waiting === undefined || waiting === 0
      ? ""
      : ` · ${count(waiting)} exit${waiting === 1 ? "" : "s"} waiting`
  const greenSub =
    finished && cured !== undefined
      ? `last incident cured ${ageDays(cured)} ago`
      : BLANK.neverLate
  // A silent record can be short on paper while the chain's grace clock has
  // not started: it moves only when the market is next touched.
  const clockIdle =
    stale && lateNow === 1 && countdown !== undefined && countdown === grace
  let amberSub = ""
  if (clockIdle)
    amberSub = `grace clock starts at the next on-chain update (record silent ${hours(
      quiet!,
    )})`
  else if (countdown !== undefined && grace !== undefined)
    amberSub = `${hours(Math.max(0, countdown))} of ${hours(grace)} left`
  let live: { state: Tone; label: string; sub: string } = {
    state: "neutral",
    label: "NOT AVAILABLE",
    sub: "",
  }
  if (closed)
    live = {
      state: "neutral",
      label: "FINISHED",
      sub: "record ends at closure",
    }
  else if (known && pastNow === 1)
    live = {
      state: "red",
      label: "PAST ALLOWED LATENESS",
      sub: `${
        countdown === undefined ? "" : `by ${hours(countdown)}`
      }${exitsWaiting}`,
    }
  else if (known && lateNow === 1)
    live = {
      state: "amber",
      label: "LATE, WITHIN ALLOWANCE",
      sub: amberSub,
    }
  else if (known)
    live = { state: "green", label: "ALL IN ORDER", sub: greenSub }
  let countdownText: string = NA
  if (closed) countdownText = "none, finished"
  else if (known) {
    if (live.state === "amber" && countdown !== undefined)
      countdownText = `${hours(Math.max(0, countdown))} left`
    else if (live.state === "red" && countdown !== undefined)
      countdownText = `${hours(countdown)} past grace`
    else if (live.state === "green") countdownText = "none, not late"
  }
  const graceText = grace === undefined ? "the grace period" : hours(grace)
  const stateBoxes: StateBox[] = [
    {
      state: "green" as Tone,
      label: "ALL IN ORDER",
      sub:
        live.state === "green"
          ? `${live.sub} (M84)`
          : "last incident cured N d ago (M84)",
    },
    {
      state: "amber" as Tone,
      label: "LATE, WITHIN ALLOWANCE",
      sub:
        live.state === "amber"
          ? `${live.sub} (D05, ticking)`
          : `N h of ${graceText} left (D05, ticking)`,
    },
    {
      state: "red" as Tone,
      label: "PAST ALLOWED LATENESS",
      sub:
        live.state === "red"
          ? `${live.sub || "past grace"} (M37)`
          : "by N h · exits waiting (M37)",
    },
  ].map((box) => ({
    ...box,
    live: box.state === live.state,
    note: box.state === live.state ? "this market now" : undefined,
  }))
  const bookNow = book ? borrowerNow(book) : undefined
  let bookLate = ""
  if (bookNow?.past) bookLate = `, ${count(bookNow.past)} past allowance`
  else if (bookNow?.late) bookLate = ", within allowance"
  let bookNowText: string | undefined
  if (bookNow && !bookNow.incomplete)
    bookNowText = bookNow.open
      ? `their book: ${count(bookNow.late)} of ${plural(
          bookNow.open,
          "market",
        )} late${bookLate}`
      : "their book: no open markets"
  const rightNow: CardSpec = {
    id: "2.4",
    page: "market",
    ids: "M21 / M85 · D05 · M84 · M37 · M82",
    kind: "state",
    value: live.label,
    state: live.state,
    verdict: null,
    sub: live.sub,
    compare: protocol
      ? `protocol right now: ${count(protocol.lateNow)} of ${plural(
          protocol.openMarkets,
          "market",
        )} late`
      : "",
    formula: closed
      ? "Lifecycle status (M77) = Closed, shown as Finished: the record ends at closure."
      : [
          "delinquent now = coverageLiquidity() > totalAssets() at block N (never the stored flag)",
          `green: Late within grace now (M21) = 0 and Past grace now (M85) = 0 → show Days since last episode cured (M84)`,
          `amber: M21 = 1 → show Grace countdown (D05) = ${graceText} − timeDelinquent`,
          "red: M85 = 1 → show time past grace and Open unpaid batches now (M37)",
          known
            ? `at this block: M21 = ${lateNow}, M85 = ${pastNow} → ${live.state}`
            : `at this block: ${NA}`,
        ].join("\n"),
    numbers: sentence(
      `late within grace now ${yesNo(lateNow)} (M21)`,
      `past grace now ${yesNo(pastNow)} (M85)`,
      `grace countdown: ${countdownText} (D05)`,
      `last activity ${show(n("M82"), (v) => `${hours(v)} ago`)} (M82)`,
      `open unpaid batches ${show(waiting, count)} (M37)`,
    ),
    chart: { expanded: <StateRow states={stateBoxes} /> },
    chips: {
      median: protocol
        ? `median market: ${
            protocol.lateNow * 2 < protocol.openMarkets ? "in order" : "late"
          }`
        : "TBD: no protocol counts at this snapshot",
      markets: protocol
        ? `${count(protocol.openMarkets - protocol.lateNow)} of ${plural(
            protocol.openMarkets,
            "market",
          )} in order right now`
        : "TBD: no protocol counts at this snapshot",
      borrower: bookNowText ?? NO_BOOK,
    },
  }

  // ---------- 2.5 What it pays ----------
  const base = n("M11")
  const fee = n("M13")
  const cost =
    base !== undefined && fee !== undefined ? base * (1 + fee / 100) : undefined
  const earned = n("M41")
  const realised = n("M39")
  const penaltyInterest = n("M27")
  const penaltyShare = n("M42")
  let penaltyFormula = `penalty share (M42): ${NA}`
  if (earned === 0) penaltyFormula = `penalty share (M42): ${BLANK.noYield}`
  else if (
    earned !== undefined &&
    penaltyInterest !== undefined &&
    penaltyShare !== undefined
  )
    penaltyFormula = `penalty share (M42) = 100 × Penalty interest paid (M27) ${units(
      penaltyInterest,
    )} / Lifetime lender interest (M41) ${units(earned)} = ${apr(penaltyShare)}`
  // Posted rates of the borrower's open, funded markets: closure zeroes a rate.
  const bookRates = (book?.markets ?? [])
    .filter(
      (row) =>
        row.state === "Ok" && row.values.M77 === "Open" && isFunded(row.values),
    )
    .map((row) => row.values.M11)
    .filter(isNumber)
  let penaltyChart: React.ReactNode
  if (earned === 0)
    penaltyChart = <Tbd>{BLANK.noYield}: no lender interest has accrued.</Tbd>
  else if (penaltyShare !== undefined)
    penaltyChart = (
      <ThresholdSliver
        sharePct={penaltyShare}
        caption={`Penalty interest paid (M27) ${show(
          penaltyInterest,
          units,
        )} of Lifetime lender interest (M41) ${show(earned, units)} = ${apr(
          penaltyShare,
        )} (M42) · amber chip only above 5%`}
      />
    )
  // A finished market's base rate is zeroed at closure; it shows what it earned.
  let paysValue: string = show(base, apr)
  let paysSub = base === undefined ? "" : "per year, paid to lenders in full"
  if (closed) {
    paysValue = earned === 0 ? BLANK.noYield : show(realised, apr)
    paysSub =
      earned === 0
        ? "the market closed before lenders earned interest"
        : "realised over its life; the rate is zeroed at closure"
  }
  const pays: CardSpec = {
    id: "2.5",
    page: "market",
    ids: "M11 · M13 · M39 · M42 = 100 × M27 / M41 · M40 · M44",
    kind: closed && earned === 0 ? "text" : "pct",
    value: paysValue,
    verdict: null,
    flag:
      earned === 0 || closed
        ? undefined
        : penaltyChip(penaltyShare) ?? undefined,
    ...(closed ? finishedFlag : {}),
    sub: paysSub,
    compare: cmp.M39
      ? `protocol median actually earned: ${percent(cmp.M39.median)}`
      : "",
    formula: [
      base === undefined
        ? `to lenders: ${NA}`
        : `to lenders = Base APR now (M11) = ${apr(base)}, in full${
            closed ? " (zeroed at closure)" : ""
          }`,
      cost === undefined
        ? `borrower all-in: ${NA}`
        : `borrower all-in = ${score(
            base!,
            2,
          )} × (1 + Protocol fee share (M13) ${percent(fee!)}) = ${apr(cost)}${
            n("M12") === undefined
              ? ""
              : ` (+ Penalty APR (M12) ${score(n("M12")!, 2)} while Penaltied)`
          }`,
      earned === 0
        ? `realised = Realised lender APR (M39): ${BLANK.noYield}`
        : `realised = Realised lender APR (M39) = ${show(realised, apr)}`,
      penaltyFormula,
    ].join("\n"),
    numbers: sentence(
      `time-weighted base APR ${show(n("M40"), apr)} (M40)`,
      `${show(n("M44"), (v) => plural(v, "rate change"))} (M44)`,
      `lifetime lender interest ${amount(earned)} (M41)`,
      `penalty interest paid ${amount(penaltyInterest)} (M27)`,
      "amber chip only when M42 > 5%",
    ),
    chart: { expanded: penaltyChart },
    chips: {
      median: cmp.M39
        ? `median realised yield ${percent(cmp.M39.median)} · ${count(
            cmp.M39.population,
          )} graded markets`
        : "TBD: no protocol median yet",
      markets:
        cmp.M11 && base !== undefined && !closed
          ? `median posted rate ${apr(cmp.M11.median)} across ${count(
              cmp.M11.population,
            )} graded open markets; this market posts ${apr(base)}`
          : "TBD: no posted rate to compare",
      borrower: borrowerChip(
        bookRates.length > 1
          ? `their ${count(bookRates.length)} open markets post ${apr(
              Math.min(...bookRates),
            )} to ${apr(Math.max(...bookRates))}`
          : undefined,
      ),
    },
  }

  // ---------- 2.6 How the line is used ----------
  const capacity = n("M06")
  const used = capacity === 0 ? undefined : n("M86")
  const owedShare =
    capacity && owed !== undefined ? (100 * owed) / capacity : undefined
  const line: CardSpec = {
    id: "2.6",
    page: "market",
    ids: "M86 = 100 × totalSupply / M06 · M07 · M59 · M60",
    kind: used === undefined ? "text" : "pct",
    value: capacity === 0 ? "no deposit capacity" : show(used, percent),
    verdict: null,
    sub: capacity ? `of the ${units(capacity)} line drawn` : "",
    compare: cmp.M86
      ? `median among open markets: ${percent(cmp.M86.median)} drawn`
      : "",
    formula: [
      used === undefined || capacity === undefined
        ? `capacity used (M86): ${NA}`
        : `capacity used (M86) = 100 × totalSupply() ${units(
            (used * capacity) / 100,
          )} / Capacity now (M06) ${units(capacity)} = ${percent(used)}`,
      `owed = Total owed to lenders now (M07) = ${show(owed, units)}`,
    ].join("\n"),
    numbers: sentence(
      `${show(n("M59"), (v) => plural(v, "draw"))} (M59) / ${show(
        n("M60"),
        (v) => plural(v, "repay"),
      )} (M60)`,
      `basis: totalSupply (locked, cheat sheet §9)${
        owedShare === undefined
          ? ""
          : `; the totalDebts basis gives ${percent(owedShare)}`
      }`,
    ),
    chart: {
      expanded:
        used !== undefined && capacity !== undefined ? (
          <FillBar
            pct={used}
            label={`${percent(used)} of ${units(capacity)} (totalSupply basis)`}
            ghostPct={owedShare}
            caption={
              owedShare === undefined
                ? undefined
                : `grey ghost = ${percent(
                    owedShare,
                  )} on the totalDebts (M07) basis; the locked basis is totalSupply (cheat sheet §9)`
            }
          />
        ) : undefined,
    },
    chips: {
      median: cmp.M86
        ? `median among open markets: ${percent(
            cmp.M86.median,
          )} drawn · ${count(cmp.M86.population)} graded open markets`
        : "TBD: no protocol median yet",
      markets:
        "not ranked: capacity use is measured, not graded as better or worse",
      borrower:
        "TBD: per-market capacity is not served on the borrower record yet",
    },
  }

  // ---------- 2.8 Incident history ----------
  const bucketIds = ["M69", "M70", "M71", "M72"]
  const bucketsKnown = bucketIds.every((id) => n(id) !== undefined)
  const buckets = bucketIds.map((id) => n(id) ?? 0)
  const finishedTotal = buckets.reduce((total, value) => total + value, 0)
  const withinDay =
    finishedTotal > 0
      ? (100 * (buckets[0] + buckets[1])) / finishedTotal
      : undefined
  const mean = n("M22")
  let historySub = ""
  if (episodes)
    historySub = join(
      `${episodes === 1 ? "incident" : "incidents"}${
        open ? `, ${count(open)} still open` : ""
      }`,
      finished && mean !== undefined ? `typical ${hours(mean)}` : undefined,
      withinDay === undefined
        ? undefined
        : `${percent(withinDay, 0)} of finished cured within a day`,
    )
  const history: CardSpec = {
    id: "2.8",
    page: "market",
    ids: "M69 M70 M71 M72 · M20 · M22",
    kind: episodes ? "count" : "text",
    value: episodes === 0 ? BLANK.noIncidents : show(episodes, count),
    verdict: null,
    sub: historySub,
    compare: cmp.M22
      ? `median market: mean episode ${hours(cmp.M22.median)}`
      : "",
    formula: [
      bucketsKnown && episodes !== undefined
        ? `Episodes under 6 h (M69) ${count(
            buckets[0],
          )} + 6 to 24 h (M70) ${count(buckets[1])} + 24 to 48 h (M71) ${count(
            buckets[2],
          )} + over 48 h (M72) ${count(buckets[3])} = ${count(
            finishedTotal,
          )} finished${
            open ? ` + ${count(open)} open` : ""
          } = Delinquency episodes (M20) ${count(episodes)}`
        : `episodes by length: ${NA}`,
      ...(withinDay === undefined
        ? []
        : [
            `cured within a day = 100 × (${count(buckets[0])} + ${count(
              buckets[1],
            )}) / ${count(finishedTotal)} finished = ${percent(withinDay, 0)}`,
          ]),
      finished
        ? `typical = Mean episode duration (M22) = ${show(mean, hours)}`
        : `typical = Mean episode duration (M22): ${
            open ? "no finished episode yet" : BLANK.noIncidents
          }`,
    ].join("\n"),
    numbers: sentence(
      bucketsKnown && finishedTotal
        ? `histogram ${buckets.map(count).join(" / ")} with the ${show(
            grace,
            hours,
          )} allowance drawn as the baseline`
        : undefined,
      open
        ? `${count(open)} episode still open, not in the histogram`
        : undefined,
      "cured within grace TBD (M83, breach recount B2)",
    ),
    chart:
      finishedTotal && bucketsKnown
        ? {
            collapsed: <Histogram buckets={buckets} compact />,
            expanded: (
              <Histogram
                buckets={buckets}
                caption={`red baseline = the ${show(
                  grace,
                  hours,
                )} allowance (M15)`}
              />
            ),
          }
        : undefined,
    chips: {
      median: cmp.M22
        ? `median market: mean episode ${hours(cmp.M22.median)} · ${count(
            cmp.M22.population,
          )} graded markets`
        : "TBD: no protocol median yet",
      markets: finished
        ? rankPhrase(cmp.M22, "markets")
        : "not ranked: no finished episode yet",
      borrower: borrowerChip(
        bookValues?.n("S12") !== undefined
          ? `their book: ${plural(
              bookValues.n("S12")!,
              "incident",
            )} across ${show(bookValues.n("S01"), (v) => plural(v, "market"))}`
          : undefined,
      ),
    },
    chipCharts: finished ? { markets: rank(cmp.M22, "markets") } : undefined,
  }

  // ---------- 2.9 Who funds it ----------
  const active = n("M48")
  const ever = n("M49")
  const largest = n("D10")
  const retention = n("M51")
  const noLenders = ever === 0
  let retentionLine = `retention (M51): ${NA}`
  if (noLenders)
    retentionLine = "Distinct lenders, lifetime (M49) = 0: no lender yet."
  else if (
    active !== undefined &&
    ever !== undefined &&
    retention !== undefined
  )
    retentionLine = `retention (M51) = 100 × Active lenders now (M48) ${count(
      active,
    )} / Distinct lenders, lifetime (M49) ${count(ever)} = ${percent(
      retention,
    )}`
  const lenderGroups =
    active !== undefined && ever !== undefined && ever > 0
      ? [
          { count: active, color: C.fg2, label: "still in (M48)" },
          {
            count: Math.max(0, ever - active),
            color: C.line,
            label: "left (M49 − M48)",
          },
        ]
      : []
  let lenderChart: React.ReactNode
  if (lenderGroups.length && ever! <= MARK_LIMIT)
    lenderChart = (
      <MarkArray
        shape="dot"
        groups={lenderGroups}
        caption={`${count(
          ever!,
        )} marks = Distinct lenders, lifetime (M49) · ${count(
          active!,
        )} filled = Active lenders now (M48)${
          retention === undefined
            ? ""
            : ` · ${percent(retention)} retention (M51)`
        }`}
      />
    )
  else if (lenderGroups.length)
    lenderChart = (
      <StackedBar
        segments={lenderGroups.map((group) => ({
          label: group.label,
          value: group.count,
          color: group.color,
        }))}
      />
    )
  let fundsValue: string = NA
  if (noLenders) fundsValue = "no lenders yet"
  else if (active !== undefined && ever !== undefined)
    fundsValue = `${count(active)} of ${count(ever)}`
  const funds: CardSpec = {
    id: "2.9",
    page: "market",
    ids: "M48 · M49 · M51 = 100 × M48 / M49 · D10",
    kind: "text",
    value: fundsValue,
    verdict: null,
    sub:
      noLenders || retention === undefined
        ? ""
        : `lenders still in · ${percent(retention)} retention`,
    compare: cmp.D10
      ? `median top-lender share across markets: ${percent(cmp.D10.median, 0)}`
      : "",
    formula: [
      retentionLine,
      noLenders
        ? "concentration (D10): no lender yet"
        : `concentration (D10) = 100 × largest scaledBalanceOf / scaledTotalSupply = ${show(
            largest,
            percent,
          )} (current balances; escrows and the market contract excluded)`,
    ].join("\n"),
    numbers: noLenders
      ? "no lender has held this market's token (M49 = 0)."
      : sentence(
          `largest current holder ${show(largest, percent)} (D10)`,
          `${show(active, count)} active (M48) of ${show(ever, (v) =>
            plural(v, "distinct lender"),
          )} ever (M49)`,
        ),
    chart: { expanded: lenderChart },
    chips: {
      median: cmp.D10
        ? `median top-lender share ${percent(cmp.D10.median, 0)} · ${count(
            cmp.D10.population,
          )} graded open markets`
        : "TBD: no protocol median yet",
      markets: cmp.M49
        ? `median distinct lenders ${count(cmp.M49.median)} across ${count(
            cmp.M49.population,
          )} graded markets`
        : "TBD: no protocol median yet",
      borrower: borrowerChip(
        bookValues?.n("S37") !== undefined
          ? `their book: ${plural(bookValues.n("S37")!, "distinct lender")}`
          : undefined,
      ),
    },
  }

  // ---------- 2.10 Terms ----------
  const types = typeLabels?.length ? typeLabels.join(", ") : NA
  const terms: CardSpec = {
    id: "2.10",
    page: "market",
    ids: "M15 · M16 · D06 · M12 · M14 · D03 · G4 · M77",
    kind: "text",
    value: show(grace, hours),
    verdict: null,
    sub: join(
      "allowed lateness",
      n("M16") === undefined ? undefined : `payout window ${hours(n("M16")!)}`,
      n("M12") === undefined ? undefined : `penalty +${score(n("M12")!, 2)}`,
      n("M14") === undefined ? undefined : `buffer ${percent(n("M14")!)}`,
    ),
    compare: closed ? "finished: no further cycles" : cycleStatus(s("D06")),
    formula: [
      "lookups only, no arithmetic:",
      `Grace period (M15) ${show(grace, hours)} · Withdrawal cycle (M16) ${show(
        n("M16"),
        hours,
      )} · Penalty APR (M12) ${show(
        n("M12"),
        (v) => `+${score(v, 2)}`,
      )} · Reserve ratio (M14) ${show(n("M14"), percent)}`,
      `Minimum deposit (D03) ${amount(
        n("D03"),
      )} · Cycle status (D06) · Market type labels (G4) · Lifecycle status (M77)`,
    ].join("\n"),
    numbers: sentence(
      `cycle status: ${cycleStatus(s("D06"))} (D06)`,
      `market type labels: ${types} (G4)`,
      `lifecycle ${lifecycle(s("M77"))} (M77)`,
      `deployed ${isoDay(s("M03"))} (M03)`,
      "cycle status is never a standing countdown",
    ),
    chips: {
      median: "TBD: protocol comparisons of terms are not computed yet (sheet)",
      markets:
        "TBD: protocol comparisons of terms are not computed yet (sheet)",
      borrower:
        "TBD: comparing terms across their markets is not computed yet (sheet)",
    },
  }

  const banner =
    position?.word === "weakest"
      ? `This is this borrower's weakest market — their ${count(
          position.count,
        )} markets: ${score(position.min)} to ${score(position.max)}.`
      : undefined

  return {
    rowA: [inOrder, worstIncident, exits, rightNow, pays],
    supporting: closed
      ? [history, funds, terms]
      : [line, history, funds, terms],
    banner,
  }
}
