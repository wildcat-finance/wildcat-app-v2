// Temporary: the metric review page (product#917). Remove with the page.
//
// Live index datums for the sixteen display treatments A–P (design handoff
// treatments.js), one per market card 2.1 to 2.10, built from the selected
// market's publication and the card specs the live page shows. The handoff's
// treatments-data.json is the worked example (wmtUSDC at block 25,749,504);
// each field follows it. A field the publication does not hold stays missing
// (-1 or null), so its treatments show the honesty state, never a shape.

import { Comparison, MarketAnalytics } from "@/components/GlassDoor/api"
import { CardSpec } from "@/components/GlassDoor/card"
import {
  ageDays,
  apr,
  BLANK,
  block,
  contractKept,
  count,
  days,
  hours,
  isSeries,
  lifeShare,
  longDate,
  percent,
  plural,
  score,
  units,
} from "@/components/GlassDoor/format"
import {
  leadingNumber,
  lifecycle,
  openEpisodes,
  reader,
  yesNo,
} from "@/components/GlassDoor/helpers"
import { Tone as StateTone, Verdict } from "@/components/GlassDoor/rules"
import { CARDS } from "@/components/GlassDoor/wording"

export type Tone = Verdict | "CONTEXT"

export const TREATMENTS = {
  A: {
    label: "Grade card",
    summary:
      "value, verdict, median line (the shipped default for 2.1, 2.2, 2.3, 3.1)",
  },
  B: {
    label: "Counted",
    summary: "events out of 100, drawn as cells (natural frequency)",
  },
  C: { label: "Rail", summary: "0–100 bar with a median tick" },
  D: { label: "Sentence", summary: "one plain claim, no chrome" },
  E: { label: "Rank", summary: "position in the population as a bar strip" },
  F: { label: "Detail", summary: "composition bar and the raw parts" },
  G: {
    label: "Share bar",
    summary:
      "status-page segments: the record's proportions, not when each part happened",
  },
  H: {
    label: "Bullet",
    summary: "value bar over weak / fair / strong bands with the median tick",
  },
  I: {
    label: "Distribution",
    summary: "percentile marker with the middle half boxed",
  },
  J: {
    label: "Dial",
    summary:
      "credit-score arc with bands (kept for comparison; the shipped pages avoid gauges)",
  },
  K: {
    label: "Scorecard row",
    summary: "this one vs typical, difference, evidence",
  },
  L: {
    label: "Aging buckets",
    summary: "receivables-aging convention: current / within allowance / past",
  },
  M: {
    label: "Covenant headroom",
    summary: "distance to the contractual limit",
  },
  N: {
    label: "Side by side",
    summary: "this value against the population median",
  },
  O: { label: "Trend", summary: "the series, where one exists" },
  P: {
    label: "Exception line",
    summary: "credit-queue item with a flag and a next step",
  },
} as const

export type TreatmentCode = keyof typeof TREATMENTS
export const TREATMENT_CODES = Object.keys(TREATMENTS) as TreatmentCode[]

/** treatments.js IndexDatum. */
export type IndexDatum = {
  id: string
  name: string
  note: string
  verdict: Tone
  value: string
  unit: string
  median: string
  sentence: string
  /** Out of 100: amber and red cells for B and G; -1 = not countable. */
  grace: number
  past: number
  countClaim: string
  countNote: string
  /** 0–100 position and the median tick for C, H, J and K; -1 = no rail. */
  rail: number
  railMed: number
  railMax?: number
  /** Shown with the rail in C, H and K when the rail is not the headline. */
  railValue?: string
  /** The median in its unit, for K and N; the bare number otherwise. */
  medText?: string
  /**
   * Which way is better on the rail, for K's difference colour. Unset means
   * neither (a measure, not a grade), so the difference stays neutral.
   */
  better?: "higher" | "lower"
  /** [better than, population] for E and I; [sits above, population] when neutral. */
  rank: [number, number] | null
  /** E and I wording for a measure with no better direction: "more lenders than". */
  rankHigher?: string
  parts: [string, string][]
  split?: [number, string][]
  /** N's rows: [label, this one, the median]. */
  sideBySide?: [string, string, string][]
  buckets: [string, string, number, string][] | null
  /** Replaces L's aging-convention key when the bars are not aging slices. */
  bucketNote?: string
  /** [value, limit, limit label, headroom label, note] for M. */
  cov: [number, number, string, string, string] | null
  /** [bar heights 0–100, from label, to label, note] for O. */
  trend: [number[], string, string, string] | null
  evidence?: string
  /** Replaces every honesty state of this index, as in the handoff. */
  unavailable?: string
  /** Why a treatment cannot be drawn for this index, per treatment. */
  reasons?: Partial<Record<TreatmentCode, string>>
}

/** The market cards the handoff draws treatments for. */
export const MARKET_CARDS = [
  "2.1",
  "2.2",
  "2.3",
  "2.4",
  "2.5",
  "2.6",
  "2.8",
  "2.9",
  "2.10",
]

export const BORROWER_CARDS = ["3.1", "3.4", "3.6", "3.8", "3.10"]
export type ReviewScope = "market" | "borrower"
export const CARD_GROUPS: {
  key: ReviewScope
  label: string
  cards: string[]
}[] = [
  { key: "market", label: "Market", cards: MARKET_CARDS },
  { key: "borrower", label: "Borrower", cards: BORROWER_CARDS },
]
export const TREATMENT_CARDS = CARD_GROUPS.flatMap((group) => group.cards)
export const cardScope = (card: string): ReviewScope =>
  card.startsWith("3.") ? "borrower" : "market"

/** The shipped pages use A, the grade card, for the graded cards. */
export const DESIGN_TREATMENT: Record<string, TreatmentCode> = {
  "2.1": "A",
  "2.2": "A",
  "2.3": "A",
  "3.1": "A",
}

const NOTES: Record<string, string> = {
  "2.1": "the cash-availability grade",
  "2.2": "the single worst moment",
  "2.3": "payout deadlines covered",
  "2.4": "live state at this block",
  "2.5": "rate and whether it was paid",
  "2.6": "utilization",
  "2.8": "shape of the lateness",
  "2.9": "lender breadth and concentration",
  "2.10": "the contract facts",
}

const STATE_TONE: Record<StateTone, Tone> = {
  green: "STRONG",
  amber: "WATCH",
  red: "PROBLEM",
  neutral: "CONTEXT",
}

const GREEN = "#28CA7C"
const AMBER = "#D7A820"
const RED = "#F1464B"
const DEEP_RED = "#C24647"
const GHOST = "#D4D6DD"
const PURPLE = "#4112B5"
const DAY = 86_400
const NA = BLANK.unavailable

const one = (value: number) => Math.round(value * 10) / 10

const rankOf = (comparison?: Comparison): [number, number] | null =>
  comparison?.betterThan === undefined
    ? null
    : [comparison.betterThan, comparison.population]

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

export const datumFromSpec = (
  spec: CardSpec,
  evidence?: string,
): IndexDatum => ({
  id: spec.id,
  name: CARDS[spec.id].name,
  note: NOTES[spec.id] ?? "",
  verdict: spec.verdict ?? "CONTEXT",
  value: spec.value,
  unit: spec.sub,
  median: spec.compare || "no protocol median yet",
  sentence: "",
  grace: -1,
  past: -1,
  countClaim: "",
  countNote: "",
  rail: -1,
  railMed: -1,
  rank: null,
  parts: [],
  buckets: null,
  cov: null,
  trend: null,
  evidence,
})

const TREND_BARS = 24

/**
 * Evenly spaced readings of a series for the trend bars: the value at each
 * step (`stepped`, a rate holds until it changes) or the nearest point.
 */
export const sampleSeries = (series: [number, number][], stepped = false) => {
  const first = series[0][0]
  const last = series[series.length - 1][0]
  const bars = Math.min(TREND_BARS, series.length)
  return Array.from({ length: bars }, (_, index) => {
    const time =
      bars === 1 ? last : first + ((last - first) * index) / (bars - 1)
    if (stepped) {
      const before = series.filter(([pointTime]) => pointTime <= time)
      return (before[before.length - 1] ?? series[0])[1]
    }
    return series.reduce((nearest, point) =>
      Math.abs(point[0] - time) < Math.abs(nearest[0] - time) ? point : nearest,
    )[1]
  })
}

const GRADED_DAYS = 90
const WEEK = 7 * DAY

export type Reasons = Partial<Record<TreatmentCode, string>>

/** The same reason for several treatments. */
export const reasonFor = (codes: TreatmentCode[], reason: string): Reasons =>
  Object.fromEntries(codes.map((code) => [code, reason]))

/** A rail's end, with room above the larger of the value and its median. */
export const railEnd = (...values: number[]) => {
  const top = Math.max(0, ...values) * 1.25
  let step = 1
  if (top > 200) step = 50
  else if (top > 50) step = 10
  else if (top > 10) step = 5
  return Math.max(step, Math.ceil(top / step) * step)
}

/** How many of the population this one sits above (a measure, not a grade). */
export const positionOf = (comparison?: Comparison): [number, number] | null =>
  comparison?.below === undefined
    ? null
    : [comparison.below, comparison.population]

/** Why E and I have no place to draw. */
export const rankReason = (
  comparison: Comparison | undefined,
  recordDays: number | undefined,
  noun: "markets" | "borrowers",
) => {
  if (!comparison)
    return `No graded ${noun} have this value yet, so there is nothing to rank against.`
  if (recordDays !== undefined && recordDays < GRADED_DAYS)
    return `Under 90 days of record (${count(
      recordDays,
    )} so far): ${noun} are ranked from 90 days.`
  return "This publication has no place for it yet; the next update adds one."
}

/** N's row for one compared value: [label, this one, the median]. */
export const versus = (
  label: string,
  value: number | undefined,
  comparison: Comparison | undefined,
  format: (value: number) => string,
): [string, string, string][] =>
  value === undefined || !comparison
    ? []
    : [[label, format(value), format(comparison.median)]]

/** O's reason when a published series is missing or too short. */
export const seriesReason = (value: unknown) =>
  isSeries(value)
    ? "Under two weeks of record: the weekly series has one reading so far."
    : "This publication has no series for it yet; the next update adds it."

/** Points grouped into equal spans of [from, to], oldest first. */
const spansOf = (points: [number, number][], from: number, to: number) => {
  const width = Math.max(1, (to - from) / TREND_BARS)
  return Array.from({ length: TREND_BARS }, (_, index) =>
    points
      .filter(([time]) => {
        const slot = Math.min(
          TREND_BARS - 1,
          Math.max(0, Math.floor((time - from) / width)),
        )
        return slot === index
      })
      .map(([, value]) => value),
  )
}

/** Trend bars scaled to their peak (or a floor), with the peak itself. */
const scaled = (values: number[], floor = 0) => {
  const peak = Math.max(floor, ...values)
  return {
    peak,
    heights: values.map((value) => (peak > 0 ? (100 * value) / peak : 0)),
  }
}

/** One datum per market card the selection has, by card number. */
export function treatmentData(
  market: MarketAnalytics,
  specs: Record<string, CardSpec>,
): Record<string, IndexDatum> {
  const { n, s } = reader(market.values)
  const cmp = market.comparisons
  const asset = s("M02")
  const amount = (value?: number) =>
    value === undefined ? NA : `${units(value)}${asset ? ` ${asset}` : ""}`
  const { cut } = market.publication
  const evidence = cut
    ? `on-chain record at block ${block(cut.block)}`
    : undefined
  const closed = s("M77") === "Closed"
  const life = n("H01")
  const late = n("H02")
  const grace = n("M15")
  const age = n("M05")
  const hasRecord = life !== undefined && life > 0
  const finished = n("M20")
  const open = openEpisodes(market.values)
  const episodes = finished === undefined ? undefined : finished + open
  const data: Record<string, IndexDatum> = {}
  const seriesOf = (id: string) => {
    const value = market.values[id]
    return isSeries(value) && value.length >= 2 ? value : undefined
  }
  const notRanked = (comparison?: Comparison) =>
    rankReason(comparison, age, "markets")
  const allowance =
    grace === undefined
      ? "the allowed lateness"
      : `the ${hours(grace)} allowance`
  // The market's life: deployment to closure, or to the cut.
  const deployed = s("M03") ? Date.parse(s("M03")!) / 1_000 : undefined
  const lifeEnd =
    deployed !== undefined && age !== undefined
      ? deployed + age * DAY
      : undefined
  const incidents = isSeries(market.values.INCIDENT_HISTORY)
    ? market.values.INCIDENT_HISTORY
    : undefined
  const noIncidents = "No incident recorded yet: nothing has been late."

  // ---------- 2.1 In order ----------
  if (specs["2.1"]) {
    const d = datumFromSpec(specs["2.1"], evidence)
    const cash = n("M18")
    const penalty = hasRecord ? n("M26") : undefined
    const kept = penalty === undefined ? undefined : 100 - penalty
    d.rank = rankOf(cmp.M18)
    if (!hasRecord) d.unavailable = "No recorded history yet."
    // Cash there over the trailing 90 days, weekly (100 − share of days late).
    const lateShare = seriesOf("LATE_SHARE_90D")
    if (lateShare) {
      const inOrder = lateShare.map(([time, share]): [number, number] => [
        time,
        100 - share,
      ])
      const first = inOrder[0]
      const last = inOrder[inOrder.length - 1]
      d.trend = [
        sampleSeries(inOrder).map((value) => Math.max(0, value)),
        `${score(first[1])} on ${longDate(first[0])}`,
        `${closed ? "last" : "now"} ${score(last[1])}`,
        "cash there over the trailing 90 days, weekly (100 − share of days late)",
      ]
    }
    if (
      hasRecord &&
      late !== undefined &&
      cash !== undefined &&
      penalty !== undefined
    ) {
      const lifeDays = life / DAY
      const shortDays = late / DAY
      const pastDays = (penalty / 100) * lifeDays
      const short = 100 - cash
      // Penalty time (M26) runs on the contract's rolling clock and can
      // outlast a cured shortfall, so it is not a slice of the short days:
      // the cells count the short days only and the penalty share is stated
      // beside them, never subtracted (the handoff's example subtracts).
      d.grace = short
      d.past = 0
      d.countClaim =
        late === 0
          ? "The promised cash was there every day: never late."
          : `${per100(short)} ${
              Math.round(short) === 1 ? "day" : "days"
            } in every 100 the promised cash was short.`
      d.countNote = `${score(shortDays)} short days of ${score(
        lifeDays,
      )} recorded · separately, ${
        penalty > 0 && penalty < 1 ? "under 1" : count(penalty)
      } in 100 days past the allowance (M26)`
      d.rail = one(cash)
      d.better = "higher"
      d.railMed = cmp.M18 ? one(cmp.M18.median) : -1
      d.medText = cmp.M18 ? score(cmp.M18.median) : undefined
      d.sentence = `Over ${count(
        lifeDays,
      )} days the promised cash was there ${score(
        cash,
      )}% of the time; counting only time past the ${
        grace === undefined ? "allowed lateness" : `${hours(grace)} allowance`
      }, the contract was kept ${contractKept(100 - penalty)}%.`
      d.parts = [
        ["days recorded", score(lifeDays)],
        ["days short", score(shortDays)],
        ["past allowance", `${lifeShare(penalty)} of life`],
        ["incidents", episodes === undefined ? NA : count(episodes)],
      ]
      // Two separate measures, not disjoint slices: past the allowance can
      // overlap the short days and can fall after them.
      const w = widths([lifeDays - shortDays, shortDays, pastDays])
      d.buckets = [
        ["cash there", days(lifeDays - shortDays), w[0], GREEN],
        ["short of cash", days(shortDays), w[1], AMBER],
        ["past allowance (M26)", days(pastDays), w[2], RED],
      ]
      d.bucketNote =
        "green cash there · amber short of cash · red past the allowance, measured on its own: it can overlap or follow the short days, so the bars are not slices of one total"
      d.sideBySide = [
        ...versus("cash there", cash, cmp.M18, score),
        ...versus(
          "contract kept",
          kept,
          cmp.M26 && { ...cmp.M26, median: 100 - cmp.M26.median },
          contractKept,
        ),
        ...versus("incidents", episodes, cmp.M20, count),
      ]
    }
    d.reasons = {
      ...(d.rank ? {} : reasonFor(["E", "I"], notRanked(cmp.M18))),
      M: "Cash availability is a share of the record, with no contractual limit of its own. The live headroom, cash held against what the contract requires, is 2.4 (M).",
      ...(d.trend ? {} : { O: seriesReason(market.values.LATE_SHARE_90D) }),
    }
    data["2.1"] = d
  }

  // ---------- 2.2 Worst incident ----------
  if (specs["2.2"]) {
    const d = datumFromSpec(specs["2.2"], evidence)
    const longest = n("M23")
    const worst = n("M24")
    const breaches = n("M25")
    d.rank = rankOf(cmp.M24)
    if (!hasRecord) d.unavailable = "No recorded history yet."
    if (hasRecord && grace && worst !== undefined) {
      d.rail = one(worst)
      d.better = "lower"
      d.railMed = cmp.M24 ? one(cmp.M24.median) : -1
      d.railMax = railEnd(120, worst + 10)
      d.medText = cmp.M24 ? percent(cmp.M24.median) : undefined
    }
    if (longest !== undefined && grace) {
      const over = longest > grace
      d.cov = [
        longest,
        grace,
        `${hours(grace)} allowance`,
        over
          ? `${hours(longest - grace)} past the limit`
          : `${hours(grace - longest)} of room`,
        "the allowed lateness is this market's hard threshold",
      ]
      d.sentence =
        longest === 0
          ? "No delinquency episode has been recorded."
          : `The longest incident ran ${hours(longest)} against the ${hours(
              grace,
            )} this market allows, so it ${
              over ? "crossed into penalty" : "stayed inside the allowance"
            }.`
    }
    // Breaches out of every 100 incidents (M25 of the episodes).
    if (episodes && breaches !== undefined) {
      const share = (100 * breaches) / episodes
      d.grace = 0
      d.past = share
      d.countClaim =
        breaches === 0
          ? `No incident ran past ${allowance}.`
          : `${per100(share)} of every 100 incidents ran past ${allowance}.`
      d.countNote = `${count(breaches)} of ${plural(
        episodes,
        "incident",
      )} breached ${allowance} (M25)`
      const w = widths([episodes - breaches, breaches])
      d.buckets = [
        ["stayed within", count(episodes - breaches), w[0], GREEN],
        ["ran past (breaches)", count(breaches), w[1], RED],
      ]
      d.bucketNote = `incidents by whether they ran past ${allowance} (M25)`
    }
    // The longest incident in each span of the market's life.
    if (incidents?.length && deployed !== undefined && lifeEnd !== undefined) {
      const longestPer = spansOf(incidents, deployed, lifeEnd).map((values) =>
        values.length ? Math.max(...values) : 0,
      )
      const { peak, heights } = scaled(longestPer, grace ?? 0)
      d.trend = [
        heights,
        longDate(deployed),
        closed ? `closed ${longDate(lifeEnd)}` : "now",
        `longest incident in each of ${TREND_BARS} spans of the market's life; full height ${hours(
          peak,
        )}, the allowance ${grace === undefined ? NA : hours(grace)}`,
      ]
    }
    d.parts = [
      ["longest incident", longest === undefined ? NA : hours(longest)],
      ["allowed lateness", grace === undefined ? NA : hours(grace)],
      [
        "breaches",
        breaches === undefined
          ? NA
          : `${count(breaches)} of ${
              episodes === undefined ? NA : count(episodes)
            }`,
      ],
      ["penalty interest paid", amount(n("M27"))],
    ]
    d.sideBySide = [
      ...versus("worst vs allowance", worst, cmp.M24, percent),
      ...versus("allowed lateness", grace, cmp.M15, hours),
    ]
    const counted =
      episodes === 0
        ? noIncidents
        : "Breaches are not counted in this publication yet."
    d.reasons = {
      ...(d.grace < 0 ? reasonFor(["B", "G", "L"], counted) : {}),
      ...(d.rank ? {} : reasonFor(["E", "I"], notRanked(cmp.M24))),
      ...(d.trend ? {} : { O: incidents ? noIncidents : seriesReason(null) }),
    }
    data["2.2"] = d
  }

  // ---------- 2.3 Exits paid on time ----------
  if (specs["2.3"]) {
    const d = datumFromSpec(specs["2.3"], evidence)
    const deadlines = n("M30")
    const covered = n("M31")
    const rate = n("M32")
    const paidLate = n("D18_LATE")
    const unpaid = n("D18_NEVER")
    const queued = n("M37")
    const unclaimed = n("M38")
    const window = n("M16")
    // "current cycle ends in 12.5 h" (D06).
    const cycleLeft = (() => {
      const match = s("D06")?.match(/ends in (-?[\d.]+) h/)
      return match ? Number(match[1]) : undefined
    })()
    d.rank = rankOf(cmp.M32)
    if (deadlines === 0)
      d.unavailable =
        "No payout deadline has come due yet, so there is nothing to count or rank."
    else if (
      deadlines !== undefined &&
      covered !== undefined &&
      rate !== undefined
    ) {
      const missed = deadlines - covered
      const split =
        paidLate !== undefined &&
        unpaid !== undefined &&
        paidLate + unpaid === missed
      d.rail = one(rate)
      d.better = "higher"
      d.railMed = cmp.M32 ? one(cmp.M32.median) : -1
      d.medText = cmp.M32 ? percent(cmp.M32.median) : undefined
      d.grace = split
        ? (100 * paidLate!) / deadlines
        : (100 * missed) / deadlines
      d.past = split ? (100 * unpaid!) / deadlines : 0
      d.countClaim = `${per100(
        (100 * missed) / deadlines,
      )} of every 100 payout deadlines were missed on the day.`
      d.countNote = `${count(missed)} of ${count(deadlines)} not covered · ${
        split
          ? `${count(paidLate!)} paid late, ${count(unpaid!)} never paid`
          : "split of late vs never not available"
      }`
      d.sentence = `${count(covered)} of ${plural(
        deadlines,
        "payout batch",
        "payout batches",
      )} were fully funded on the day they came due; ${count(missed)} ${
        missed === 1 ? "was" : "were"
      } not. ${
        queued
          ? `${plural(queued, "batch is", "batches are")} queued now`
          : "No batches are queued now"
      }${
        unclaimed === undefined
          ? ""
          : ` and ${amount(unclaimed)} sits unclaimed`
      }.`
      d.parts = [
        ["deadlines", count(deadlines)],
        ["covered on the day", count(covered)],
        ["open batches now", queued === undefined ? NA : count(queued)],
        ["unclaimed", amount(unclaimed)],
      ]
      if (split) {
        const w = widths([covered, paidLate!, unpaid!])
        d.buckets = [
          ["covered on the day", count(covered), w[0], GREEN],
          ["paid late", count(paidLate!), w[1], AMBER],
          ["never paid", count(unpaid!), w[2], RED],
        ]
      } else {
        const w = widths([covered, missed])
        d.buckets = [
          ["covered on the day", count(covered), w[0], GREEN],
          ["not covered", count(missed), w[1], AMBER],
          ["still owed", BLANK.splitSoon, 4, GHOST],
        ]
      }
      const coveredToDate = seriesOf("COVERED_TO_DATE")
      if (coveredToDate) {
        const first = coveredToDate[0]
        const last = coveredToDate[coveredToDate.length - 1]
        d.trend = [
          sampleSeries(coveredToDate),
          `${percent(first[1])} by ${longDate(first[0])}`,
          `${closed ? "last" : "now"} ${percent(last[1])}`,
          "share of payout deadlines covered on the day, to date, weekly",
        ]
      }
      d.sideBySide = [
        ...versus("covered on the day", rate, cmp.M32, percent),
        ...versus("amount paid at expiry", n("M33"), cmp.M33, percent),
      ]
    }
    // The running payout cycle against its window.
    if (!closed && cycleLeft !== undefined && window) {
      const left = Math.min(window, Math.max(0, cycleLeft))
      d.cov = [
        window - left,
        window,
        `${hours(window)} payout window`,
        `${hours(left)} until this cycle's deadline`,
        "the running payout cycle; whether the cash covers it is known at the deadline",
      ]
    }
    let noCycle =
      "No payout cycle is running: the next starts with the next withdrawal request."
    if (closed) noCycle = "Closed: no payout cycle runs after closure."
    d.reasons = {
      ...(d.rank ? {} : reasonFor(["E", "I"], notRanked(cmp.M32))),
      ...(d.cov ? {} : { M: noCycle }),
      ...(d.trend ? {} : { O: seriesReason(market.values.COVERED_TO_DATE) }),
    }
    data["2.3"] = d
  }

  // ---------- 2.4 Right now ----------
  if (specs["2.4"]) {
    const spec = specs["2.4"]
    const d = datumFromSpec(spec, evidence)
    const state = spec.state ?? "neutral"
    const countdown = n("D05") ?? leadingNumber(s("D05"))
    const waiting = n("M37")
    const cured = n("M84")
    const held = n("M08")
    const required = n("REQUIRED_CASH")
    d.verdict = STATE_TONE[state]
    // A state is neither a population of 100 nor a score comparable with the
    // protocol's share of markets. Keep those treatments unavailable.
    if (state === "green") {
      d.countNote = `nothing past the allowance · ${plural(
        waiting ?? 0,
        "open exit batch",
        "open exit batches",
      )}`
      d.sentence = `The market is meeting its obligations at this block, with nothing past the allowance${
        waiting ? "" : " and no exit queue"
      }.${
        cured === undefined
          ? ""
          : ` The last incident was cured ${ageDays(cured)} ago.`
      }`
      // In order: what the contract requires as a share of the cash held.
      if (held !== undefined && required !== undefined && held > 0) {
        const share = (100 * required) / held
        d.cov = [
          share,
          100,
          "all the cash held",
          `${amount(
            Math.max(0, held - required),
          )} above what the contract requires`,
          "required liquidity (reserve plus queued payouts) as a share of the cash held; past 100% the market is late",
        ]
      }
    } else if (state === "amber" && grace && countdown !== undefined) {
      const left = Math.max(0, countdown)
      d.cov = [
        grace - left,
        grace,
        `${hours(grace)} allowance`,
        `${hours(left)} left`,
        "the grace clock at this block",
      ]
      d.sentence = `The market is late at this block but within its allowance, with ${hours(
        left,
      )} of ${hours(grace)} left.`
    } else if (state === "red" && grace && countdown !== undefined) {
      d.cov = [
        grace + countdown,
        grace,
        `${hours(grace)} allowance`,
        `${hours(countdown)} past the limit`,
        "the grace clock at this block",
      ]
      d.sentence = `The market is past its allowed lateness at this block, by ${hours(
        countdown,
      )}${
        waiting
          ? `, with ${plural(waiting, "exit batch", "exit batches")} waiting`
          : ""
      }.`
    } else if (closed)
      d.sentence = "The market is finished: the record ends at closure."
    // Hours late in each of the last weeks, up to 24.
    if (!closed && incidents && cut && age !== undefined) {
      const weeks = Math.max(
        1,
        Math.min(TREND_BARS, Math.ceil((age * DAY) / WEEK)),
      )
      const lateHours = Array.from({ length: weeks }, (_, index) => {
        const to = cut.timestamp - (weeks - 1 - index) * WEEK
        const from = to - WEEK
        return (
          incidents.reduce(
            (total, [onset, length]) =>
              total +
              Math.max(
                0,
                Math.min(to, onset + length * 3_600) - Math.max(from, onset),
              ),
            0,
          ) / 3_600
        )
      })
      d.trend = [
        lateHours.map((value) => (100 * value) / 168),
        `${plural(weeks, "week")} ago`,
        "this week",
        lateHours.some((value) => value > 0)
          ? `hours late in each of the last ${plural(
              weeks,
              "week",
            )}, against a full week of 168 h`
          : `no hour late in the last ${plural(weeks, "week")}`,
      ]
    }
    let noLimit =
      "The state at this block is unknown, so there is no limit to measure against."
    if (closed)
      noLimit = "Closed: the grace clock and the reserve no longer apply."
    else if (state === "green" && held === 0)
      noLimit =
        "No cash is held and nothing is owed, so the contract requires none."
    else if (state === "green")
      noLimit =
        "This publication has no cash requirement for the market yet; the next update adds it."
    d.parts = [
      ["late within grace now", yesNo(n("M21"))],
      ["past grace now", yesNo(n("M85"))],
      ["open batches", waiting === undefined ? NA : count(waiting)],
      ["last cure", cured === undefined ? NA : `${ageDays(cured)} ago`],
    ]
    d.reasons = {
      ...reasonFor(
        ["E", "I"],
        "A live state is not ranked: the protocol ranks records, not the state at one block.",
      ),
      L: "One market is in one state at a time, so there is nothing to bucket; 3.4 buckets the borrower's markets by state.",
      ...(d.cov ? {} : { M: noLimit }),
      ...(d.trend
        ? {}
        : {
            O: closed
              ? "Closed: the record ends at closure; its last weeks are on 2.1 (O)."
              : seriesReason(market.values.INCIDENT_HISTORY),
          }),
    }
    data["2.4"] = d
  }

  // ---------- 2.5 What it pays ----------
  if (specs["2.5"]) {
    const spec = specs["2.5"]
    const d = datumFromSpec(spec, evidence)
    const base = n("M11")
    const average = n("M40")
    const realised = n("M39")
    const earned = n("M41")
    const penaltyShare = n("M42")
    const penaltyInterest = n("M27")
    // The card's headline: the posted rate while open, realised once closed.
    const railComparison = closed ? cmp.M39 : cmp.M11
    const railNumber = closed ? realised : base
    d.verdict = spec.flag && spec.flagTone === "watch" ? "WATCH" : "CONTEXT"
    d.rank = positionOf(railComparison)
    d.rankHigher = closed
      ? "a higher realised rate than"
      : "a higher posted rate than"
    if (earned === 0) d.unavailable = "No lender interest has accrued yet."
    else if (penaltyShare !== undefined) {
      d.grace = penaltyShare
      d.past = 0
      d.countClaim = `${per100(
        penaltyShare,
      )} of every 100 dollars lenders earned came from penalty interest.`
      d.countNote = `penalty interest ${amount(penaltyInterest)} of ${amount(
        earned,
      )} earned (M42)`
      // The card's amber line: penalty interest above 5% of what lenders earned.
      d.cov = [
        penaltyShare,
        5,
        "5% of interest from penalties",
        penaltyShare > 5
          ? `${score(penaltyShare - 5, 2)} points over`
          : `${score(5 - penaltyShare, 2)} points below`,
        "the card's amber line for penalty interest (M42 above 5%), not a contract limit",
      ]
    }
    if (earned && penaltyInterest !== undefined) {
      const w = widths([earned - penaltyInterest, penaltyInterest])
      d.buckets = [
        ["base interest", amount(earned - penaltyInterest), w[0], GREEN],
        ["penalty interest", amount(penaltyInterest), w[1], AMBER],
      ]
      d.bucketNote = "what lenders earned, by kind (M41 split by M27)"
    }
    if (railNumber !== undefined && !(closed && earned === 0)) {
      d.rail = one(railNumber)
      d.railMed = railComparison ? one(railComparison.median) : -1
      d.railMax = railEnd(railNumber, railComparison?.median ?? 0)
      d.medText = railComparison ? apr(railComparison.median) : undefined
    }
    // The base rate over the market's life, stepped at each change.
    const rates = seriesOf("RATE_HISTORY")
    if (rates) {
      const samples = sampleSeries(rates, true)
      const max = Math.max(...samples)
      const first = rates[0]
      const last = rates[rates.length - 1]
      d.trend = [
        samples.map((value) => (max > 0 ? (100 * value) / max : 0)),
        `${apr(first[1])} from ${longDate(first[0])}`,
        `${closed ? "last" : "now"} ${apr(last[1])}`,
        `base APR over the market's life (${plural(
          rates.length - 1,
          "rate change",
        )}; lifetime average ${average === undefined ? NA : apr(average)})`,
      ]
    }
    d.sentence = closed
      ? `The market is finished; lenders realised ${
          realised === undefined ? NA : apr(realised)
        } over its life.`
      : `The market pays ${
          base === undefined ? NA : apr(base)
        } a year to lenders in full${
          realised === undefined
            ? ""
            : `; over its life lenders realised ${apr(realised)}`
        }${
          cmp.M39
            ? `, against a protocol median of ${percent(
                cmp.M39.median,
              )} actually earned`
            : ""
        }.`
    d.parts = [
      ["base APR now", base === undefined ? NA : apr(base)],
      ["realised APR", realised === undefined ? NA : apr(realised)],
      ["penalty share", penaltyShare === undefined ? NA : apr(penaltyShare)],
      ["penalty APR", n("M12") === undefined ? NA : `+${score(n("M12")!, 2)}`],
    ]
    d.sideBySide = [
      ...(closed ? [] : versus("base APR now", base, cmp.M11, apr)),
      ...versus("realised APR", realised, cmp.M39, apr),
      ...versus(
        "penalty APR",
        n("M12"),
        cmp.M12,
        (value) => `+${score(value, 2)}`,
      ),
    ]
    d.reasons = {
      ...(d.rank ? {} : reasonFor(["E", "I"], notRanked(railComparison))),
      ...(d.rail >= 0 && d.railMed < 0
        ? reasonFor(
            ["K", "N"],
            "No graded market posts a rate to compare with yet.",
          )
        : {}),
      ...(d.trend ? {} : { O: seriesReason(market.values.RATE_HISTORY) }),
    }
    data["2.5"] = d
  }

  // ---------- 2.6 How the line is used ----------
  if (specs["2.6"]) {
    const d = datumFromSpec(specs["2.6"], evidence)
    const capacity = n("M06")
    const used = n("M86")
    d.rank = positionOf(cmp.M86)
    d.rankHigher = "more of its line drawn than"
    if (capacity === 0)
      d.unavailable = "No deposit capacity: the market has no line to draw on."
    else if (capacity !== undefined && used !== undefined) {
      const drawn = (used * capacity) / 100
      d.rail = one(used)
      d.railMed = cmp.M86 ? one(cmp.M86.median) : -1
      d.railMax = used > 100 ? railEnd(used) : undefined
      d.medText = cmp.M86 ? percent(cmp.M86.median) : undefined
      d.grace = Math.min(100, used)
      d.past = 0
      d.countClaim = `${per100(used)} of every 100 committed dollars are drawn.`
      d.countNote = `${amount(drawn)} drawn of a ${amount(capacity)} line`
      d.cov = [
        used,
        100,
        "100% of the credit line",
        used > 100
          ? `${score(used - 100)} points over`
          : `${score(100 - used)} points of room left`,
        "use of the committed line (totalSupply basis)",
      ]
      const w = widths([drawn, Math.abs(capacity - drawn)])
      d.buckets = [
        ["drawn", amount(drawn), w[0], PURPLE],
        used > 100
          ? ["over the line", amount(drawn - capacity), w[1], RED]
          : ["room left", amount(capacity - drawn), w[1], GHOST],
      ]
      d.bucketNote = "the committed line, drawn and undrawn (totalSupply basis)"
      d.sentence = `${percent(
        used,
      )} of the committed credit line is drawn: ${amount(
        drawn,
      )} against a ${amount(capacity)} line${
        cmp.M86
          ? `, where the median open market sits at ${percent(cmp.M86.median)}`
          : ""
      }.`
      d.parts = [
        ["drawn", amount(drawn)],
        ["line", amount(capacity)],
        ["room left", amount(Math.max(0, capacity - drawn))],
      ]
      d.sideBySide = versus("drawn", used, cmp.M86, percent)
    }
    const utilization = seriesOf("UTILIZATION_HISTORY")
    if (utilization) {
      const first = utilization[0]
      const last = utilization[utilization.length - 1]
      const samples = sampleSeries(utilization)
      const { peak, heights } = scaled(samples, 100)
      d.trend = [
        heights,
        `${percent(first[1])} on ${longDate(first[0])}`,
        `now ${percent(last[1])}`,
        `share of the credit line drawn, weekly; full height ${percent(peak)}`,
      ]
    }
    d.reasons = {
      ...(d.rank ? {} : reasonFor(["E", "I"], notRanked(cmp.M86))),
      ...(d.rail >= 0 && d.railMed < 0
        ? reasonFor(["K", "N"], "No graded open market to compare with yet.")
        : {}),
      ...(d.trend
        ? {}
        : { O: seriesReason(market.values.UTILIZATION_HISTORY) }),
    }
    data["2.6"] = d
  }

  // ---------- 2.8 Incident history ----------
  if (specs["2.8"]) {
    const d = datumFromSpec(specs["2.8"], evidence)
    const buckets = ["M69", "M70", "M71", "M72"].map((id) => n(id))
    const total = buckets.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    const cured = n("M83")
    const average = n("M22")
    if (finished) d.rank = rankOf(cmp.M22)
    if (episodes === 0) d.unavailable = "No incidents recorded yet."
    else if (buckets.every((value) => value !== undefined) && total > 0) {
      const [short, day, twoDays, longer] = buckets as number[]
      d.grace = (100 * twoDays) / total
      d.past = (100 * longer) / total
      d.countClaim = `${per100(
        (100 * (twoDays + longer)) / total,
      )} of every 100 finished incidents ran longer than a day.`
      d.countNote = `${count(twoDays + longer)} of ${count(
        total,
      )} over 24 h · ${count(longer)} over two days`
      d.sentence = `Of ${plural(total, "finished incident")}, ${count(
        short,
      )} lasted under six hours, ${count(day)} between six and 24, ${count(
        twoDays,
      )} ran one to two days and ${count(longer)} ran longer.${
        open
          ? ` ${plural(open, "incident is", "incidents are")} still open.`
          : ""
      }`
      d.parts = [
        ["under 6 h", count(short)],
        ["6–24 h", count(day)],
        ["1–2 d", count(twoDays)],
        ["over 2 d", count(longer)],
      ]
      const w = widths([short, day, twoDays, longer])
      d.buckets = [
        ["under 6 h", count(short), w[0], GREEN],
        ["6–24 h", count(day), w[1], AMBER],
        ["1–2 d", count(twoDays), w[2], RED],
        ["over 2 d", count(longer), w[3], DEEP_RED],
      ]
    }
    // Share of finished incidents cured within grace (M83).
    if (cured !== undefined) {
      d.rail = one(cured)
      d.better = "higher"
      d.railMed = cmp.M83 ? one(cmp.M83.median) : -1
      d.railValue = `${percent(cured)} cured in time`
      d.medText = cmp.M83 ? percent(cmp.M83.median) : undefined
    }
    // The average finished incident against the allowance.
    if (finished && average !== undefined && grace) {
      const over = average > grace
      d.cov = [
        average,
        grace,
        `${hours(grace)} allowance`,
        over
          ? `${hours(average - grace)} past the limit`
          : `${hours(grace - average)} of room on the average incident`,
        "the average finished incident against the allowance (M22 against M15)",
      ]
    }
    // Incidents started in each span of the market's life.
    if (incidents?.length && deployed !== undefined && lifeEnd !== undefined) {
      const perSpan = spansOf(incidents, deployed, lifeEnd).map(
        (values) => values.length,
      )
      const { peak, heights } = scaled(perSpan)
      d.trend = [
        heights,
        longDate(deployed),
        closed ? `closed ${longDate(lifeEnd)}` : "now",
        `incidents started in each of ${TREND_BARS} spans of the market's life; full height ${plural(
          peak,
          "incident",
        )}`,
      ]
    }
    d.sideBySide = [
      ...versus("cured within grace", cured, cmp.M83, percent),
      ...versus("average incident", average, cmp.M22, hours),
      ...versus("finished incidents", finished, cmp.M20, count),
    ]
    const onlyOpen =
      "Only an open incident so far: the shape counts finished incidents."
    d.reasons = {
      ...(d.grace < 0 ? reasonFor(["B", "G", "L"], onlyOpen) : {}),
      ...(d.rail < 0 ? reasonFor(["C", "H", "K", "N"], onlyOpen) : {}),
      ...(d.rail >= 0 && d.railMed < 0
        ? reasonFor(
            ["K", "N"],
            "No graded market has a finished incident to compare with yet.",
          )
        : {}),
      ...(d.rank
        ? {}
        : reasonFor(["E", "I"], finished ? notRanked(cmp.M22) : onlyOpen)),
      ...(d.cov ? {} : { M: onlyOpen }),
      ...(d.trend ? {} : { O: seriesReason(market.values.INCIDENT_HISTORY) }),
    }
    data["2.8"] = d
  }

  // ---------- 2.9 Who funds it ----------
  if (specs["2.9"]) {
    const d = datumFromSpec(specs["2.9"], evidence)
    const active = n("M48")
    const ever = n("M49")
    const largest = n("D10")
    const retention = n("M51")
    d.rank = positionOf(cmp.M49)
    d.rankHigher = "more lenders than"
    if (ever === 0) d.unavailable = "No lender yet."
    else {
      if (largest !== undefined) {
        d.grace = largest
        d.past = 0
        d.countClaim = `${per100(
          largest,
        )} of every 100 dollars come from the largest lender.`
        d.countNote = `biggest single lender ${percent(largest)}${
          active !== undefined && ever !== undefined
            ? ` · ${count(active)} active of ${count(ever)} ever`
            : ""
        }`
        d.split = [
          [largest, PURPLE],
          [Math.max(0, 100 - largest), GHOST],
        ]
      }
      if (retention !== undefined) {
        d.rail = one(retention)
        d.railMed = cmp.M51 ? one(cmp.M51.median) : -1
        d.railValue = `${percent(retention)} still in`
        d.medText = cmp.M51 ? percent(cmp.M51.median) : undefined
      }
      if (active !== undefined && ever !== undefined) {
        d.sentence = `${count(active)} lenders are active of ${count(
          ever,
        )} who ever deposited${
          largest === undefined ? "" : `; the biggest holds ${percent(largest)}`
        }.`
        const w = widths([active, ever - active])
        d.buckets = [
          ["still holding", count(active), w[0], GREEN],
          ["left", count(ever - active), w[1], GHOST],
        ]
        d.bucketNote =
          "lenders who ever deposited, by whether they still hold a balance"
      }
      d.parts = [
        ["active now", active === undefined ? NA : count(active)],
        ["ever", ever === undefined ? NA : count(ever)],
        ["biggest holder", largest === undefined ? NA : percent(largest)],
        ["retention", retention === undefined ? NA : percent(retention)],
      ]
    }
    const lenders = seriesOf("LENDERS_TO_DATE")
    if (lenders && ever) {
      const samples = sampleSeries(lenders, true)
      const { heights } = scaled(samples)
      d.trend = [
        heights,
        `${plural(lenders[0][1], "lender")} by ${longDate(lenders[0][0])}`,
        `now ${count(lenders[lenders.length - 1][1])}`,
        "lenders who ever deposited, to date, weekly",
      ]
    }
    d.sideBySide = [
      ...versus("lenders ever", ever, cmp.M49, count),
      ...versus("still holding", retention, cmp.M51, percent),
      ...versus("largest holder", largest, cmp.D10, percent),
    ]
    const openOnly = closed
      ? "Closed: retention is compared across open markets only."
      : "No graded open market to compare with yet."
    d.reasons = {
      ...(d.rank ? {} : reasonFor(["E", "I"], notRanked(cmp.M49))),
      ...(d.rail >= 0 && d.railMed < 0 ? reasonFor(["K", "N"], openOnly) : {}),
      M: "No contract limit governs how much one lender holds or how many lenders there are.",
      ...(d.trend ? {} : { O: seriesReason(market.values.LENDERS_TO_DATE) }),
    }
    data["2.9"] = d
  }

  // ---------- 2.10 Terms ----------
  if (specs["2.10"]) {
    const d = datumFromSpec(specs["2.10"], evidence)
    const window = n("M16")
    const reserve = n("M14")
    const penaltyRate = n("M12")
    const penaltyText = (value: number) => `+${score(value, 2)} APR`
    if (grace !== undefined) {
      d.rail = one(grace)
      d.railMed = cmp.M15 ? one(cmp.M15.median) : -1
      d.railMax = railEnd(grace, cmp.M15?.median ?? 0)
      d.medText = cmp.M15 ? hours(cmp.M15.median) : undefined
    }
    d.rank = positionOf(cmp.M15)
    d.rankHigher = "a longer grace period than"
    d.parts = [
      ["lifecycle", lifecycle(s("M77"))],
      ["allowed lateness", grace === undefined ? NA : hours(grace)],
      ["payout window", window === undefined ? NA : hours(window)],
      ["reserve ratio", reserve === undefined ? NA : percent(reserve)],
      ["penalty", penaltyRate === undefined ? NA : penaltyText(penaltyRate)],
    ]
    d.sideBySide = [
      ...versus("allowed lateness", grace, cmp.M15, hours),
      ...versus("payout window", window, cmp.M16, hours),
      ...versus("reserve ratio", reserve, cmp.M14, percent),
      ...versus("penalty", penaltyRate, cmp.M12, penaltyText),
    ]
    d.sentence = `${lifecycle(s("M77"))}: lateness tolerated for ${
      grace === undefined ? NA : hours(grace)
    }, payouts due within ${window === undefined ? NA : hours(window)}, a ${
      reserve === undefined ? NA : percent(reserve)
    } reserve ratio, and a penalty of ${
      penaltyRate === undefined ? NA : penaltyText(penaltyRate)
    } once past the allowance.`
    d.reasons = {
      ...reasonFor(
        ["B", "G"],
        "Contract facts, not a measured rate: nothing to count out of 100. Nearest honest form: the parts list in treatment F.",
      ),
      ...(d.rank ? {} : reasonFor(["E", "I"], notRanked(cmp.M15))),
      ...(d.rail >= 0 && d.railMed < 0
        ? reasonFor(["K", "N"], "No graded market to compare terms with yet.")
        : {}),
      L: "Contract terms have no age or status to bucket.",
      M: "These terms are the limits themselves; the headroom against them is on 2.2 (the allowance), 2.4 (the reserve) and 2.6 (the credit line).",
      O: "The grace period, payout window and penalty are fixed when the market is deployed, so they have no history; the base rate's is on 2.5 (O).",
    }
    data["2.10"] = d
  }

  Object.values(data).forEach((d) => {
    if (!d.sentence)
      // eslint-disable-next-line no-param-reassign
      d.sentence = `${d.name}: ${d.value}${d.unit ? `, ${d.unit}` : ""}.`
  })
  return data
}

// ---------- the reviewer's choice per card ----------

export const TREATMENT_KEY = "glassdoor-review:treatments:v1"

/** Chosen treatment per card; a card without one uses its design default. */
export type TreatmentPicks = Record<string, TreatmentCode>

export const cleanPicks = (raw: unknown): TreatmentPicks => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(
      (entry): entry is [string, TreatmentCode] =>
        TREATMENT_CARDS.includes(entry[0]) &&
        TREATMENT_CODES.includes(entry[1] as TreatmentCode),
    ),
  )
}

export const chosenTreatment = (picks: TreatmentPicks, card: string) =>
  picks[card] ?? DESIGN_TREATMENT[card]

/**
 * Choosing is idempotent. Reset is a separate action.
 */
export const choose = (
  picks: TreatmentPicks,
  card: string,
  code: TreatmentCode,
): TreatmentPicks => {
  const next = { ...picks }
  if (code === DESIGN_TREATMENT[card]) delete next[card]
  else next[card] = code
  return next
}

/** One line per card, for the summary and its copy. */
export const cardName = (card: string) =>
  CARDS[card as keyof typeof CARDS]?.name ?? `card ${card}`

/** "2.1-C Rail", or the live card when no treatment is chosen. */
export const choiceText = (card: string, code?: TreatmentCode) =>
  code ? `${card}-${code} ${TREATMENTS[code].label}` : "the live card"

/** The design's choice for a card, in words. */
export const designText = (card: string) =>
  choiceText(card, DESIGN_TREATMENT[card])

export const treatmentLines = (picks: TreatmentPicks) =>
  TREATMENT_CARDS.map((card) => {
    const code = chosenTreatment(picks, card)
    const changed = Boolean(picks[card])
    const choice = `${choiceText(card, code)}${
      changed ? ` (changed; design: ${designText(card)})` : " (design)"
    }`
    return { card, text: `${card} ${cardName(card)}: ${choice}`, changed }
  })

/**
 * Whether a treatment can be drawn from this datum; when it cannot, its tile
 * shows the honesty state instead (the same conditions the tiles use).
 */
export const drawable = (code: TreatmentCode, d: IndexDatum) => {
  switch (code) {
    case "B":
    case "G":
      return d.grace >= 0
    case "C":
    case "H":
    case "J":
      return d.rail >= 0
    case "E":
    case "I":
      return d.rank !== null
    case "K":
      return d.rail >= 0 && d.railMed >= 0
    case "L":
      return d.buckets !== null
    case "M":
      return d.cov !== null
    case "N":
      return Boolean(d.sideBySide?.length) || (d.rail >= 0 && d.railMed >= 0)
    case "O":
      return d.trend !== null
    default:
      return true
  }
}

/** Each tile's own honesty state, when its index gives no reason. */
export const TILE_FALLBACK: Partial<Record<TreatmentCode, string>> = {
  B: "Not countable out of 100.",
  G: "Not a share of the record.",
  C: "No 0–100 rail for this index.",
  H: "No 0–100 rail for this index.",
  J: "No 0–100 rail for this index.",
  E: "This index has no protocol-wide ranking in the snapshot.",
  I: "No population ranking for this index in the snapshot.",
  K: "This snapshot has no comparable value and benchmark.",
  N: "This snapshot has no comparable value and benchmark.",
  L: "This index has no aging dimension: nothing here is measured by how long it has been outstanding.",
  M: "No contractual threshold governs this index, so there is no headroom to draw.",
  O: "This index has no series in this publication, so there is no trend to plot.",
}

/** Rendering a shape is not sufficient evidence that it is a valid choice. */
export const referenceReason = (card: string, code: TreatmentCode) => {
  if (code === "J") return "The design excludes gauges from the product."
  if (
    ["2.4", "3.4"].includes(card) &&
    ["B", "C", "G", "H", "K", "N"].includes(code)
  )
    return "A current state has no frequency, score or comparable population value."
  return undefined
}

export const treatmentIssue = (code: TreatmentCode, d: IndexDatum) => {
  const reference = referenceReason(d.id, code)
  if (reference) return reference
  if (drawable(code, d)) return undefined
  // The whole index's state first (no record yet), then this tile's reason.
  return d.unavailable ?? d.reasons?.[code] ?? TILE_FALLBACK[code]
}

/** A card number typed into Go to metric ("2.2", "card 2.10"). */
export const findTreatmentCard = (text: string) => {
  const match = text.trim().match(/^(?:card\s*)?(\d+\.\d+)$/i)
  return match && TREATMENT_CARDS.includes(match[1]) ? match[1] : undefined
}
