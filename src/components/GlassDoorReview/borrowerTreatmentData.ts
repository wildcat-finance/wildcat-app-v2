import {
  BorrowerAnalytics,
  BorrowerMarketRow,
} from "@/components/GlassDoor/api"
import { bookState, marketLabel } from "@/components/GlassDoor/borrowerSpecs"
import { CardSpec } from "@/components/GlassDoor/card"
import {
  block,
  contractKept,
  count,
  days,
  hours,
  isNumber,
  isSeries,
  longDate,
  percent,
  plural,
  score,
} from "@/components/GlassDoor/format"
import {
  isFunded,
  leadingNumber,
  openEpisodes,
  reader,
} from "@/components/GlassDoor/helpers"

import {
  BORROWER_CARDS,
  datumFromSpec,
  IndexDatum,
  positionOf,
  railEnd,
  rankReason,
  reasonFor,
  sampleSeries,
  seriesReason,
  versus,
} from "./treatmentData"

const GREEN = "#28CA7C"
const AMBER = "#D7A820"
const RED = "#F1464B"
const GHOST = "#D4D6DD"
const PURPLE = "#4112B5"
const ROWS = 5

const one = (value: number) => Math.round(value * 10) / 10

/** "17", or "Under 1" for a share that rounds to nothing but is not zero. */
const per100 = (value: number) =>
  value > 0 && Math.round(value) < 1 ? "Under 1" : count(value)

/** Bar widths against the largest, as the handoff sizes its buckets. */
const widths = (values: number[]) => {
  const max = Math.max(...values, 0)
  return values.map((value) => {
    if (max <= 0 || value <= 0) return 0
    return Math.max(1, Math.round((100 * value) / max))
  })
}

/** Trend bars scaled to their peak. */
const scaled = (values: number[]) => {
  const peak = Math.max(0, ...values)
  return values.map((value) => (peak > 0 ? (100 * value) / peak : 0))
}

/** Borrower treatments use published book values, never a synthetic market. */
export const borrowerTreatmentData = (
  borrower: BorrowerAnalytics,
  specs: Record<string, CardSpec>,
): Record<string, IndexDatum> => {
  if (borrower.state !== "Ok" || !Object.keys(borrower.values).length) return {}
  const { n } = reader(borrower.values)
  const cmp = borrower.comparisons
  const evidence = borrower.publication.cut
    ? `borrower record at block ${block(borrower.publication.cut.block)}${
        borrower.partial ? " · partial record" : ""
      }`
    : undefined
  const marketDays = n("MARKET_DAYS")
  const notRanked = (comparison?: (typeof cmp)[string]) =>
    rankReason(comparison, marketDays, "borrowers")
  const seriesOf = (id: string) => {
    const value = borrower.values[id]
    return isSeries(value) && value.length >= 2 ? value : undefined
  }
  const funded = borrower.markets.filter(
    (row) => row.state === "Ok" && isFunded(row.values),
  )
  const noMarket = "No funded market yet, so there is no record to show."
  const data: Record<string, IndexDatum> = {}
  BORROWER_CARDS.forEach((card) => {
    const spec = specs[card]
    if (!spec) return
    const datum = datumFromSpec(spec, evidence)
    datum.median = spec.compare
    datum.sentence = [spec.value, spec.sub].filter(Boolean).join(". ")
    datum.parts = [["headline", spec.value]]
    if (spec.sub) datum.parts.push(["record", spec.sub])
    if (spec.compare) datum.parts.push(["comparison", spec.compare])
    if (borrower.partial) datum.parts.push(["coverage", "partial record"])
    if (!funded.length) datum.unavailable = noMarket
    data[card] = datum
  })

  // ---------- 3.1 In order, all markets ----------
  const inOrder = data["3.1"]
  const cash = n("S05")
  const kept = n("D21")
  if (
    inOrder &&
    marketDays !== undefined &&
    marketDays > 0 &&
    cash !== undefined
  ) {
    const comparison = cmp.S05
    const short = 100 - cash
    inOrder.rail = cash
    inOrder.railMed = comparison?.median ?? -1
    inOrder.medText = comparison ? score(comparison.median) : undefined
    inOrder.better = "higher"
    inOrder.sentence = `Across ${
      borrower.partial ? "the available markets' " : ""
    }${plural(
      marketDays,
      "market-day",
    )} of recorded history, the required cash was there ${percent(
      cash,
    )} of the time, weighted by market age.`
    if (comparison?.betterThan !== undefined)
      inOrder.rank = [comparison.betterThan, comparison.population]
    inOrder.parts = [
      ["cash there", score(cash)],
      ["recorded market-days", count(marketDays)],
    ]
    if (kept !== undefined) inOrder.parts.push(["contract kept", score(kept)])
    const floor = n("S06")
    const top = n("S07")
    if (floor !== undefined && top !== undefined)
      inOrder.parts.push(["market range", `${score(floor)} to ${score(top)}`])
    if (borrower.partial) inOrder.parts.push(["coverage", "partial record"])
    // Short market-days out of every 100, weighted by market age (S05).
    inOrder.grace = short
    inOrder.past = 0
    inOrder.countClaim =
      short <= 0
        ? "The promised cash was there on every market-day: never late."
        : `${per100(
            short,
          )} in every 100 market-days the promised cash was short.`
    inOrder.countNote = `${percent(short)} of ${plural(
      marketDays,
      "market-day",
    )}, weighted by market age${
      kept === undefined
        ? ""
        : ` · separately, contract kept ${contractKept(kept)} (D21)`
    }`
    const shortDays = (short / 100) * marketDays
    const pastDays =
      kept === undefined ? undefined : ((100 - kept) / 100) * marketDays
    const w = widths([marketDays - shortDays, shortDays, pastDays ?? 0])
    inOrder.buckets = [
      ["cash there", days(marketDays - shortDays), w[0], GREEN],
      ["short of cash", days(shortDays), w[1], AMBER],
      ...(pastDays === undefined
        ? []
        : [
            ["past allowance (D21)", days(pastDays), w[2], RED] as [
              string,
              string,
              number,
              string,
            ],
          ]),
    ]
    inOrder.bucketNote =
      "market-days across the book, weighted by market age · red past the allowance, measured on its own: it can overlap or follow the short days"
    inOrder.sideBySide = [
      ...versus("cash there", cash, comparison, score),
      ...versus("contract kept", kept, cmp.D21, contractKept),
    ]
    const lateShare = seriesOf("LATE_SHARE_90D")
    if (lateShare) {
      const inOrderSeries = lateShare.map(([time, share]): [number, number] => [
        time,
        100 - share,
      ])
      const first = inOrderSeries[0]
      const last = inOrderSeries[inOrderSeries.length - 1]
      inOrder.trend = [
        sampleSeries(inOrderSeries).map((value) => Math.max(0, value)),
        `${score(first[1])} on ${longDate(first[0])}`,
        `now ${score(last[1])}`,
        "cash there across the book over the trailing 90 days, weekly (100 − share of book-days late)",
      ]
    }
  }
  if (inOrder && funded.length && cash === undefined)
    inOrder.unavailable = "No recorded history yet across the funded markets."
  if (inOrder)
    inOrder.reasons = {
      ...(inOrder.rank ? {} : reasonFor(["E", "I"], notRanked(cmp.S05))),
      M: "Cash availability is a share of the record, with no contractual limit of its own. The live headroom across the markets is 3.4 (M).",
      ...(inOrder.trend
        ? {}
        : { O: seriesReason(borrower.values.LATE_SHARE_90D) }),
    }

  // ---------- 3.4 Right now, all markets ----------
  const now = data["3.4"]
  if (now) {
    const state = bookState(borrower)
    const onTime = state.now.open - state.now.late - state.now.unknown
    now.verdict = {
      green: "STRONG" as const,
      amber: "WATCH" as const,
      red: "PROBLEM" as const,
      neutral: "CONTEXT" as const,
    }[state.tone]
    now.parts = [
      ["open markets", count(state.now.open)],
      ["late, within allowance", count(state.now.late - state.now.past)],
      ["past allowance", count(state.now.past)],
      ["unavailable states", count(state.now.unknown)],
    ]
    if (state.now.incomplete) now.parts.push(["coverage", "partial record"])
    // The receivables-aging convention across the open markets.
    if (state.now.open > 0) {
      const counts = [
        onTime,
        state.now.late - state.now.past,
        state.now.past,
        state.now.unknown,
      ]
      const w = widths(counts)
      now.buckets = [
        ["on time", plural(counts[0], "market"), w[0], GREEN],
        ["late, within allowance", plural(counts[1], "market"), w[1], AMBER],
        ["past allowance", plural(counts[2], "market"), w[2], RED],
        ...(counts[3]
          ? [
              [
                "state unavailable",
                plural(counts[3], "market"),
                w[3],
                GHOST,
              ] as [string, string, number, string],
            ]
          : []),
      ]
      now.bucketNote = "open markets by state at this block"
    }
    // The tightest open market: the late one nearest (or furthest past) its
    // limit, or else the one whose contract asks most of its cash.
    const clock = (row: BorrowerMarketRow) => {
      const { n: value, s } = reader(row.values)
      const grace = value("M15")
      const reading = value("D05") ?? leadingNumber(s("D05"))
      if (grace === undefined || reading === undefined) return undefined
      return row.values.M85 === 1 ? grace + reading : grace - reading
    }
    const late = state.now.lateRows
      .map((row) => ({ row, used: clock(row) }))
      .filter(
        (entry): entry is { row: BorrowerMarketRow; used: number } =>
          entry.used !== undefined,
      )
      .sort((left, right) => right.used - left.used)[0]
    const tightest = funded
      .filter(
        (row) =>
          row.values.M77 === "Open" &&
          isNumber(row.values.M08) &&
          row.values.M08 > 0 &&
          isNumber(row.values.REQUIRED_CASH),
      )
      .map((row) => ({
        row,
        share:
          (100 * Number(row.values.REQUIRED_CASH)) / Number(row.values.M08),
      }))
      .sort((left, right) => right.share - left.share)[0]
    if (late) {
      const grace = Number(late.row.values.M15)
      const over = late.used > grace
      now.cov = [
        late.used,
        grace,
        `${hours(grace)} allowance in ${marketLabel(late.row)}`,
        over
          ? `${hours(late.used - grace)} past the limit`
          : `${hours(grace - late.used)} left`,
        "the late market nearest its limit: its grace clock at this block",
      ]
    } else if (tightest && !state.now.late)
      now.cov = [
        tightest.share,
        100,
        `all the cash held in ${marketLabel(tightest.row)}`,
        `${percent(Math.max(0, 100 - tightest.share))} of its cash is spare`,
        "the tightest open market: required liquidity as a share of its cash held; past 100% it is late",
      ]
    let noLimit =
      "This publication has no per-market cash requirement yet; the next update adds it."
    if (state.now.open === 0)
      noLimit = "No open market, so no limit applies at this block."
    const lateShare = seriesOf("LATE_SHARE_90D")
    if (lateShare && state.now.open > 0) {
      const recent = lateShare.slice(-24)
      const peak = Math.max(0, ...recent.map(([, value]) => value))
      now.trend = [
        scaled(recent.map(([, value]) => value)),
        `${plural(recent.length, "week")} ago`,
        "this week",
        peak > 0
          ? `share of book time late over the trailing 90 days, the last ${plural(
              recent.length,
              "week",
            )}; full height ${percent(peak)}`
          : `no book time late in the last ${plural(recent.length, "week")}`,
      ]
    }
    now.reasons = {
      ...reasonFor(
        ["E", "I"],
        "A live state is not ranked: the protocol ranks records, not the state at one block.",
      ),
      ...(now.buckets
        ? {}
        : { L: "No open market, so there is nothing to bucket." }),
      ...(now.cov ? {} : { M: noLimit }),
      ...(now.trend
        ? {}
        : {
            O:
              state.now.open === 0
                ? "No open market: the book's last weeks are on 3.1 (O)."
                : seriesReason(borrower.values.LATE_SHARE_90D),
          }),
    }
  }

  // ---------- 3.6 Completed credit cycle ----------
  const cycle = data["3.6"]
  if (cycle) {
    // Capital is already guarded for mixed assets and partial books by the spec.
    const markets = n("S01")
    const completed = n("S30")
    const verified = n("S33")
    const clean = n("S34")
    const share = n("S32")
    if (completed !== undefined)
      cycle.parts.push(["completed facilities", count(completed)])
    if (verified !== undefined)
      cycle.parts.push(["verified completions", count(verified)])
    if (clean !== undefined) cycle.parts.push(["clean closures", count(clean)])
    if (share !== undefined)
      cycle.parts.push(["share of recorded life completed", percent(share)])
    if (share !== undefined) {
      cycle.grace = share
      cycle.past = 0
      cycle.countClaim = `${per100(
        share,
      )} of every 100 market-days on record belong to facilities that ran to completion.`
      cycle.countNote = `${plural(
        completed ?? 0,
        "completed facility",
        "completed facilities",
      )} of ${plural(markets ?? 0, "funded market")} (S32)`
      cycle.rail = one(share)
      cycle.railMed = cmp.S32 ? one(cmp.S32.median) : -1
      cycle.railValue = `${percent(share)} completed`
      cycle.medText = cmp.S32 ? percent(cmp.S32.median) : undefined
    }
    cycle.rank = positionOf(cmp.S32)
    cycle.rankHigher = "a larger completed share than"
    if (
      markets !== undefined &&
      completed !== undefined &&
      clean !== undefined
    ) {
      const counts = [clean, completed - clean, markets - completed]
      const w = widths(counts)
      cycle.buckets = [
        ["completed cleanly", plural(counts[0], "market"), w[0], GREEN],
        ["completed, incident open", plural(counts[1], "market"), w[1], AMBER],
        ["still running", plural(counts[2], "market"), w[2], GHOST],
      ]
      cycle.bucketNote =
        "funded markets by how they ended: closed with nothing late · closed while an incident was open · still running"
    }
    const completions = seriesOf("COMPLETED_TO_DATE")
    if (completions && completed) {
      const samples = sampleSeries(completions, true)
      cycle.trend = [
        scaled(samples),
        `${count(completions[0][1])} by ${longDate(completions[0][0])}`,
        `now ${count(completions[completions.length - 1][1])}`,
        "completed facilities to date, weekly",
      ]
    }
    cycle.sideBySide = [
      ...versus("completed share", share, cmp.S32, percent),
      ...versus("completed facilities", completed, cmp.S30, count),
    ]
    cycle.reasons = {
      ...(cycle.rank ? {} : reasonFor(["E", "I"], notRanked(cmp.S32))),
      ...(cycle.rail >= 0 && cycle.railMed < 0
        ? reasonFor(
            ["K", "N"],
            "No graded borrower has a completed share to compare with yet.",
          )
        : {}),
      M: "No contract sets how many facilities must complete, so there is no headroom to draw.",
      ...(cycle.trend
        ? {}
        : {
            O: completed
              ? seriesReason(borrower.values.COMPLETED_TO_DATE)
              : "No facility has completed yet, so there is nothing to plot.",
          }),
    }
  }

  // ---------- 3.8 Discipline ----------
  // Grace breaches: episodes that ran past their grace period, per 100.
  const discipline = data["3.8"]
  const breaches = n("S13")
  const incidents = n("S12")
  if (discipline) {
    const rate = n("BREACHES_PER_100")
    const comparison = cmp.BREACHES_PER_100
    if (incidents === 0)
      discipline.unavailable =
        "No incident recorded yet: nothing has been late."
    if (breaches !== undefined && incidents !== undefined)
      discipline.sentence = `${plural(
        breaches,
        "grace breach",
        "grace breaches",
      )} in ${plural(incidents, "incident")}${
        rate === undefined ? "" : `: ${score(rate)} per 100 episodes`
      }.`
    if (rate !== undefined && breaches !== undefined && incidents) {
      discipline.grace = 0
      discipline.past = rate
      discipline.countClaim =
        breaches === 0
          ? "No incident ran past its allowance."
          : `${per100(rate)} of every 100 incidents ran past the allowance.`
      discipline.countNote = `${count(breaches)} of ${plural(
        incidents,
        "incident",
      )} across ${plural(funded.length, "market")} (S13 of S12)`
      discipline.rail = one(rate)
      discipline.railMed = comparison ? one(comparison.median) : -1
      discipline.railMax = railEnd(rate, comparison?.median ?? 0, 4)
      discipline.railValue = `${score(rate)} per 100`
      discipline.medText = comparison ? score(comparison.median) : undefined
      discipline.better = "lower"
    }
    if (comparison?.betterThan !== undefined)
      discipline.rank = [comparison.betterThan, comparison.population]
    // Where the breaches happened: the markets with the most, of their incidents.
    const perMarket = funded
      .map((row) => {
        const { n: value } = reader(row.values)
        return {
          row,
          breaches: value("M25"),
          incidents: (value("M20") ?? 0) + openEpisodes(row.values),
        }
      })
      .filter(
        (
          entry,
        ): entry is {
          row: BorrowerMarketRow
          breaches: number
          incidents: number
        } => entry.breaches !== undefined && entry.incidents > 0,
      )
      .sort(
        (left, right) =>
          right.breaches - left.breaches || right.incidents - left.incidents,
      )
    if (perMarket.length) {
      const shown = perMarket.slice(0, ROWS)
      const w = widths(shown.map((entry) => entry.incidents))
      discipline.buckets = shown.map((entry, index) => [
        marketLabel(entry.row),
        `${count(entry.breaches)} of ${count(entry.incidents)}`,
        w[index],
        entry.breaches ? RED : GREEN,
      ])
      discipline.bucketNote = `grace breaches of each market's incidents (M25), bars sized by incidents${
        perMarket.length > ROWS
          ? `; the ${count(ROWS)} markets with the most of ${count(
              perMarket.length,
            )}`
          : ""
      }`
    }
    // The book's longest incident against its own market's allowance.
    const longestRow = funded
      .filter((row) => isNumber(row.values.M23) && isNumber(row.values.M15))
      .sort(
        (left, right) => Number(right.values.M23) - Number(left.values.M23),
      )[0]
    const longest = n("D15")
    if (
      longestRow &&
      longest !== undefined &&
      Number(longestRow.values.M15) > 0
    ) {
      const grace = Number(longestRow.values.M15)
      const over = longest > grace
      discipline.cov = [
        longest,
        grace,
        `${hours(grace)} allowance in ${marketLabel(longestRow)}`,
        over
          ? `${hours(longest - grace)} past the limit`
          : `${hours(grace - longest)} of room`,
        "the book's longest incident (D15) against its own market's allowance",
      ]
    }
    const toDate = seriesOf("BREACHES_TO_DATE")
    if (toDate) {
      const samples = sampleSeries(toDate)
      const first = toDate[0]
      const last = toDate[toDate.length - 1]
      const peak = Math.max(0, ...samples)
      discipline.trend = [
        scaled(samples),
        `${score(first[1])} by ${longDate(first[0])}`,
        `now ${score(last[1])}`,
        peak > 0
          ? `grace breaches per 100 incidents, to date, weekly; full height ${score(
              peak,
            )}`
          : "grace breaches per 100 incidents, to date, weekly: none so far",
      ]
    }
    discipline.sideBySide = [
      ...versus("per 100 incidents", rate, comparison, score),
      ...versus("incidents", incidents, cmp.S12, count),
      ...versus("average incident", n("D16"), cmp.D16, hours),
    ]
    discipline.reasons = {
      ...(discipline.rank ? {} : reasonFor(["E", "I"], notRanked(comparison))),
      ...(discipline.rail >= 0 && discipline.railMed < 0
        ? reasonFor(
            ["K", "N"],
            "No graded borrower has a breach rate to compare with yet.",
          )
        : {}),
      ...(discipline.trend
        ? {}
        : { O: seriesReason(borrower.values.BREACHES_TO_DATE) }),
    }
  }

  // ---------- 3.10 Lender breadth ----------
  const breadth = data["3.10"]
  const lenders = n("S37")
  if (breadth) {
    const comparison = cmp.S37
    if (lenders !== undefined) {
      breadth.sentence = `${plural(lenders, "distinct lender")} ${
        lenders === 1 ? "has" : "have"
      } funded this borrower across its ${
        borrower.partial ? "available " : ""
      }markets.`
      breadth.rail = lenders
      breadth.railMed = comparison?.median ?? -1
      breadth.railMax = railEnd(lenders, comparison?.median ?? 0)
      breadth.medText = comparison ? count(comparison.median) : undefined
    }
    // A lender count is a measure, not a grade: its place, not "better than".
    breadth.rank = positionOf(comparison)
    breadth.rankHigher = "more distinct lenders than"
    const perMarket = funded
      .map((row) => ({ row, lenders: reader(row.values).n("M49") ?? 0 }))
      .filter((entry) => entry.lenders > 0)
      .sort((left, right) => right.lenders - left.lenders)
    if (perMarket.length) {
      const shown = perMarket.slice(0, ROWS)
      const w = widths(shown.map((entry) => entry.lenders))
      breadth.buckets = shown.map((entry, index) => [
        marketLabel(entry.row),
        count(entry.lenders),
        w[index],
        PURPLE,
      ])
      breadth.bucketNote = `lenders who ever deposited, per market; one lender in several markets counts in each${
        perMarket.length > ROWS
          ? ` · the ${count(ROWS)} largest of ${count(
              perMarket.length,
            )} markets`
          : ""
      }`
    }
    const toDate = seriesOf("LENDERS_TO_DATE")
    if (toDate && lenders) {
      breadth.trend = [
        scaled(sampleSeries(toDate, true)),
        `${plural(toDate[0][1], "lender")} by ${longDate(toDate[0][0])}`,
        `now ${count(toDate[toDate.length - 1][1])}`,
        "distinct lenders across the book, to date, weekly",
      ]
    }
    breadth.sideBySide = [
      ...versus("distinct lenders", lenders, comparison, count),
      ...versus("funded markets", n("S01"), cmp.S01, count),
    ]
    breadth.reasons = {
      ...reasonFor(
        ["B", "G"],
        "A count of lenders, not a share: nothing to count out of 100.",
      ),
      ...(breadth.rank ? {} : reasonFor(["E", "I"], notRanked(comparison))),
      ...(breadth.rail >= 0 && breadth.railMed < 0
        ? reasonFor(["K", "N"], "No graded borrower to compare with yet.")
        : {}),
      ...(breadth.buckets ? {} : { L: "No lender has deposited yet." }),
      M: "No contract limits how many lenders fund a borrower, so there is no headroom to draw.",
      ...(breadth.trend
        ? {}
        : {
            O: lenders
              ? seriesReason(borrower.values.LENDERS_TO_DATE)
              : "No lender has deposited yet.",
          }),
    }
  }
  return data
}
