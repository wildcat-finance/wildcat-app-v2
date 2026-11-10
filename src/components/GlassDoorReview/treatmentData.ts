// Temporary: the metric review page (product#917). Remove with the page.
//
// Live index datums for the sixteen display treatments A–P (design handoff
// treatments.js), one per market card 2.1 to 2.10, built from the selected
// market's publication and the card specs the live page shows. The handoff's
// treatments-data.json is the worked example (wmtUSDC at block 25,749,504);
// each field follows it. A field the publication does not hold stays missing
// (-1 or null), so its treatments show the honesty state, never a shape.
// Every word a tile shows is in glassDoor.json under treatments.

import { Comparison, MarketAnalytics } from "@/components/GlassDoor/api"
import { CardSpec } from "@/components/GlassDoor/card"
import {
  ageDays,
  apr,
  BLANK,
  block,
  contractKept,
  count,
  counted,
  days,
  hours,
  isSeries,
  lifeShare,
  longDate,
  percent,
  percentOf,
  score,
  units,
  withAsset,
} from "@/components/GlassDoor/format"
import {
  lifecycle,
  openEpisodes,
  RankNoun,
  reader,
  yesNo,
} from "@/components/GlassDoor/helpers"
import { GATES, Tone as StateTone, Verdict } from "@/components/GlassDoor/rules"
import {
  cardCopy,
  cardKey,
  CARD_IDS,
  hasText,
  scoped,
  text,
  textAt,
} from "@/components/GlassDoor/text"

export type Tone = Verdict | "CONTEXT"

const CODES = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
] as const

export type TreatmentCode = (typeof CODES)[number]
export const TREATMENT_CODES: TreatmentCode[] = [...CODES]

/** Each treatment's label and one-line summary. */
export const TREATMENTS = Object.fromEntries(
  CODES.map((code) => [
    code,
    {
      label: text(`treatments.names.${code}.label`),
      summary: text(`treatments.names.${code}.summary`),
    },
  ]),
) as Record<TreatmentCode, { label: string; summary: string }>

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
const WEEK = 7 * DAY
const NA = BLANK.unavailable

const shared = scoped("treatments.shared")
const t21 = scoped("treatments.card_2_1")
const t22 = scoped("treatments.card_2_2")
const t23 = scoped("treatments.card_2_3")
const t24 = scoped("treatments.card_2_4")
const t25 = scoped("treatments.card_2_5")
const t26 = scoped("treatments.card_2_6")
const t28 = scoped("treatments.card_2_8")
const t29 = scoped("treatments.card_2_9")
const t210 = scoped("treatments.card_2_10")

const one = (value: number) => Math.round(value * 10) / 10

const rankOf = (comparison?: Comparison): [number, number] | null =>
  comparison?.betterThan === undefined
    ? null
    : [comparison.betterThan, comparison.population]

/** "17", or "Under 1" for a share that rounds to nothing but is not zero. */
export const per100 = (value: number) =>
  value > 0 && Math.round(value) < 1 ? shared("under1") : count(value)

/** Bar widths against the largest, as the handoff sizes its buckets. */
export const widths = (values: number[]) => {
  const max = Math.max(...values, 0)
  return values.map((value) => {
    if (max <= 0 || value <= 0) return 0
    return Math.max(1, Math.round((100 * value) / max))
  })
}

export const datumFromSpec = (
  spec: CardSpec,
  evidence?: string,
): IndexDatum => {
  const note = `treatments.${cardKey(spec.id)}.note`
  return {
    id: spec.id,
    name: cardCopy(spec.id).name,
    note: hasText(note) ? textAt(note) : "",
    verdict: spec.verdict ?? "CONTEXT",
    value: spec.value,
    unit: spec.sub,
    median: spec.compare || shared("noMedian"),
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
  }
}

export const TREND_BARS = 24

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
  noun: RankNoun,
) => {
  const among = text(`shared.rank.${noun}`)
  if (!comparison) return shared("rankNone", { noun: among })
  if (recordDays !== undefined && recordDays < GATES.gradeDays)
    return shared("rankYoung", {
      gate: GATES.gradeDays,
      has: count(recordDays),
      noun: among,
    })
  return shared("rankPending")
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
  isSeries(value) ? shared("seriesShort") : shared("seriesPending")

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
    value === undefined ? NA : withAsset(units(value), asset)
  const { cut } = market.publication
  const evidence = cut
    ? shared("evidenceMarket", { block: block(cut.block) })
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
      ? shared("allowanceUnknown")
      : shared("allowance", { grace: hours(grace) })
  /** A limit drawn at the grace period: "48 h allowance". */
  const graceLimit = (value: number) =>
    shared("limitAllowance", { grace: hours(value) })
  /** A series' latest reading: "now 96.7", or "last 96.7" once closed. */
  const latest = (value: string) =>
    closed ? shared("trendLast", { value }) : shared("trendNow", { value })
  // The market's life: deployment to closure, or to the cut.
  const deployed = s("M03") ? Date.parse(s("M03")!) / 1_000 : undefined
  const lifeEnd =
    deployed !== undefined && age !== undefined
      ? deployed + age * DAY
      : undefined
  const lifeEndLabel = (end: number) =>
    closed ? shared("closedOn", { date: longDate(end) }) : shared("now")
  const incidents = isSeries(market.values.INCIDENT_HISTORY)
    ? market.values.INCIDENT_HISTORY
    : undefined
  const noIncidents = shared("noIncidents")
  const penaltyRate = (value: number) =>
    text("cards.card_2_10.penaltyRate", { rate: score(value, 2) })

  // ---------- 2.1 In order ----------
  if (specs["2.1"]) {
    const d = datumFromSpec(specs["2.1"], evidence)
    const cash = n("M18")
    const penalty = hasRecord ? n("M26") : undefined
    const kept = penalty === undefined ? undefined : 100 - penalty
    d.rank = rankOf(cmp.M18)
    if (!hasRecord) d.unavailable = shared("noRecord")
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
        shared("trendOn", {
          value: score(first[1]),
          date: longDate(first[0]),
        }),
        latest(score(last[1])),
        t21("trend"),
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
          ? t21("claimNever")
          : t21("claim", { count: Math.round(short), n: per100(short) })
      d.countNote = t21("countNote", {
        short: score(shortDays),
        life: score(lifeDays),
        past:
          penalty > 0 && penalty < 1 ? shared("under1Lower") : count(penalty),
      })
      d.rail = one(cash)
      d.better = "higher"
      d.railMed = cmp.M18 ? one(cmp.M18.median) : -1
      d.medText = cmp.M18 ? score(cmp.M18.median) : undefined
      d.sentence = t21("sentence", {
        days: count(lifeDays),
        cash: score(cash),
        allowance,
        kept: contractKept(100 - penalty),
      })
      d.parts = [
        [t21("parts.daysRecorded"), score(lifeDays)],
        [t21("parts.daysShort"), score(shortDays)],
        [
          t21("parts.pastAllowance"),
          t21("parts.ofLife", { share: lifeShare(penalty) }),
        ],
        [t21("parts.incidents"), episodes === undefined ? NA : count(episodes)],
      ]
      // Two separate measures, not disjoint slices: past the allowance can
      // overlap the short days and can fall after them.
      const w = widths([lifeDays - shortDays, shortDays, pastDays])
      d.buckets = [
        [t21("buckets.cashThere"), days(lifeDays - shortDays), w[0], GREEN],
        [t21("buckets.short"), days(shortDays), w[1], AMBER],
        [t21("buckets.past"), days(pastDays), w[2], RED],
      ]
      d.bucketNote = t21("buckets.note")
      d.sideBySide = [
        ...versus(t21("sideBySide.cash"), cash, cmp.M18, score),
        ...versus(
          t21("sideBySide.kept"),
          kept,
          cmp.M26 && { ...cmp.M26, median: 100 - cmp.M26.median },
          contractKept,
        ),
        ...versus(t21("sideBySide.incidents"), episodes, cmp.M20, count),
      ]
    }
    d.reasons = {
      ...(d.rank ? {} : reasonFor(["E", "I"], notRanked(cmp.M18))),
      M: t21("reasons.M"),
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
    if (!hasRecord) d.unavailable = shared("noRecord")
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
        graceLimit(grace),
        over
          ? shared("pastLimit", { hours: hours(longest - grace) })
          : shared("room", { hours: hours(grace - longest) }),
        t22("covNote"),
      ]
      const ran = { longest: hours(longest), grace: hours(grace) }
      if (longest === 0) d.sentence = t22("sentenceNone")
      else
        d.sentence = over
          ? t22("sentenceOver", ran)
          : t22("sentenceWithin", ran)
    }
    // Breaches out of every 100 incidents (M25 of the episodes).
    if (episodes && breaches !== undefined) {
      const share = (100 * breaches) / episodes
      d.grace = 0
      d.past = share
      d.countClaim =
        breaches === 0
          ? t22("claimNone", { allowance })
          : t22("claim", { n: per100(share), allowance })
      d.countNote = t22("countNote", {
        breaches: count(breaches),
        incidents: counted("incident", episodes),
        allowance,
      })
      const w = widths([episodes - breaches, breaches])
      d.buckets = [
        [t22("buckets.within"), count(episodes - breaches), w[0], GREEN],
        [t22("buckets.past"), count(breaches), w[1], RED],
      ]
      d.bucketNote = t22("buckets.note", { allowance })
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
        lifeEndLabel(lifeEnd),
        t22("trend", {
          spans: TREND_BARS,
          peak: hours(peak),
          grace: grace === undefined ? NA : hours(grace),
        }),
      ]
    }
    d.parts = [
      [t22("parts.longest"), longest === undefined ? NA : hours(longest)],
      [t22("parts.allowed"), grace === undefined ? NA : hours(grace)],
      [
        t22("parts.breaches"),
        breaches === undefined
          ? NA
          : t22("parts.breachesOf", {
              breaches: count(breaches),
              episodes: episodes === undefined ? NA : count(episodes),
            }),
      ],
      [t22("parts.penalty"), amount(n("M27"))],
    ]
    d.sideBySide = [
      ...versus(t22("sideBySide.worst"), worst, cmp.M24, percent),
      ...versus(t22("sideBySide.allowed"), grace, cmp.M15, hours),
    ]
    const counted100 = episodes === 0 ? noIncidents : t22("reasons.notCounted")
    d.reasons = {
      ...(d.grace < 0 ? reasonFor(["B", "G", "L"], counted100) : {}),
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
    // Cycle status (D06): hours until the running payout cycle ends.
    const cycleLeft = n("D06")
    d.rank = rankOf(cmp.M32)
    if (deadlines === 0) d.unavailable = t23("unavailable")
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
      d.countClaim = t23("claim", { n: per100((100 * missed) / deadlines) })
      const notCovered = {
        missed: count(missed),
        deadlines: count(deadlines),
      }
      d.countNote = split
        ? t23("countNoteSplit", {
            ...notCovered,
            late: count(paidLate!),
            never: count(unpaid!),
          })
        : t23("countNote", notCovered)
      const queue = queued
        ? t23("queued", { count: queued, n: count(queued) })
        : t23("queuedNone")
      d.sentence = t23("sentence", {
        covered: count(covered),
        batches: counted("payoutBatch", deadlines),
        missed: t23("missed", { count: missed, n: count(missed) }),
        queue:
          unclaimed === undefined
            ? queue
            : t23("queueUnclaimed", { queue, amount: amount(unclaimed) }),
      })
      d.parts = [
        [t23("parts.deadlines"), count(deadlines)],
        [t23("parts.covered"), count(covered)],
        [t23("parts.open"), queued === undefined ? NA : count(queued)],
        [t23("parts.unclaimed"), amount(unclaimed)],
      ]
      if (split) {
        const w = widths([covered, paidLate!, unpaid!])
        d.buckets = [
          [t23("buckets.covered"), count(covered), w[0], GREEN],
          [t23("buckets.paidLate"), count(paidLate!), w[1], AMBER],
          [t23("buckets.neverPaid"), count(unpaid!), w[2], RED],
        ]
      } else {
        const w = widths([covered, missed])
        d.buckets = [
          [t23("buckets.covered"), count(covered), w[0], GREEN],
          [t23("buckets.notCovered"), count(missed), w[1], AMBER],
          [t23("buckets.stillOwed"), BLANK.splitSoon, 4, GHOST],
        ]
      }
      const coveredToDate = seriesOf("COVERED_TO_DATE")
      if (coveredToDate) {
        const first = coveredToDate[0]
        const last = coveredToDate[coveredToDate.length - 1]
        d.trend = [
          sampleSeries(coveredToDate),
          shared("trendBy", {
            value: percent(first[1]),
            date: longDate(first[0]),
          }),
          latest(percent(last[1])),
          t23("trend"),
        ]
      }
      d.sideBySide = [
        ...versus(t23("sideBySide.covered"), rate, cmp.M32, percent),
        ...versus(t23("sideBySide.paid"), n("M33"), cmp.M33, percent),
      ]
    }
    // The running payout cycle against its window.
    if (!closed && cycleLeft !== undefined && window) {
      const left = Math.min(window, Math.max(0, cycleLeft))
      d.cov = [
        window - left,
        window,
        t23("cov.limit", { window: hours(window) }),
        t23("cov.left", { hours: hours(left) }),
        t23("cov.note"),
      ]
    }
    d.reasons = {
      ...(d.rank ? {} : reasonFor(["E", "I"], notRanked(cmp.M32))),
      ...(d.cov
        ? {}
        : { M: closed ? t23("reasons.closed") : t23("reasons.noCycle") }),
      ...(d.trend ? {} : { O: seriesReason(market.values.COVERED_TO_DATE) }),
    }
    data["2.3"] = d
  }

  // ---------- 2.4 Right now ----------
  if (specs["2.4"]) {
    const spec = specs["2.4"]
    const d = datumFromSpec(spec, evidence)
    const state = spec.state ?? "neutral"
    // Grace countdown (D05): hours left in the allowance, negative once past.
    const clock = n("D05")
    const waiting = n("M37")
    const cured = n("M84")
    const held = n("M08")
    const required = n("REQUIRED_CASH")
    d.verdict = STATE_TONE[state]
    // A state is neither a population of 100 nor a score comparable with the
    // protocol's share of markets. Keep those treatments unavailable.
    if (state === "green") {
      d.countNote = t24("greenNote", {
        batches: counted("openExitBatch", waiting ?? 0),
      })
      const meeting = waiting
        ? t24("greenSentence")
        : t24("greenSentenceNoQueue")
      d.sentence =
        cured === undefined
          ? meeting
          : t24("cured", { sentence: meeting, days: ageDays(cured) })
      // In order: what the contract requires as a share of the cash held.
      if (held !== undefined && required !== undefined && held > 0) {
        const share = (100 * required) / held
        d.cov = [
          share,
          100,
          t24("cash.limit"),
          t24("cash.spare", { amount: amount(Math.max(0, held - required)) }),
          t24("cash.note"),
        ]
      }
    } else if (state === "amber" && grace && clock !== undefined) {
      const left = Math.max(0, clock)
      d.cov = [
        grace - left,
        grace,
        graceLimit(grace),
        t24("clock.left", { hours: hours(left) }),
        t24("clock.note"),
      ]
      d.sentence = t24("amberSentence", {
        left: hours(left),
        grace: hours(grace),
      })
    } else if (state === "red" && grace && clock !== undefined) {
      const past = Math.abs(clock)
      d.cov = [
        grace + past,
        grace,
        graceLimit(grace),
        shared("pastLimit", { hours: hours(past) }),
        t24("clock.note"),
      ]
      d.sentence = waiting
        ? t24("redSentenceWaiting", {
            hours: hours(past),
            batches: counted("exitBatch", waiting),
          })
        : t24("redSentence", { hours: hours(past) })
    } else if (closed) d.sentence = t24("closedSentence")
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
      const span = counted("week", weeks)
      d.trend = [
        lateHours.map((value) => (100 * value) / 168),
        shared("weeksAgo", { weeks: span }),
        shared("thisWeek"),
        lateHours.some((value) => value > 0)
          ? t24("trend", { weeks: span })
          : t24("trendNone", { weeks: span }),
      ]
    }
    let noLimit = t24("reasons.unknown")
    if (closed) noLimit = t24("reasons.closed")
    else if (state === "green" && held === 0) noLimit = t24("reasons.noCash")
    else if (state === "green") noLimit = t24("reasons.pending")
    d.parts = [
      [t24("parts.late"), yesNo(n("M21"))],
      [t24("parts.past"), yesNo(n("M85"))],
      [t24("parts.batches"), waiting === undefined ? NA : count(waiting)],
      [
        t24("parts.cure"),
        cured === undefined ? NA : shared("ago", { days: ageDays(cured) }),
      ],
    ]
    d.reasons = {
      ...reasonFor(["E", "I"], shared("liveNotRanked")),
      L: t24("reasons.L"),
      ...(d.cov ? {} : { M: noLimit }),
      ...(d.trend
        ? {}
        : {
            O: closed
              ? t24("reasons.trendClosed")
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
    const amberLine = GATES.penaltyShareAmber
    // The card's headline: the posted rate while open, realised once closed.
    const railComparison = closed ? cmp.M39 : cmp.M11
    const railNumber = closed ? realised : base
    d.verdict = spec.flag && spec.flagTone === "watch" ? "WATCH" : "CONTEXT"
    d.rank = positionOf(railComparison)
    d.rankHigher = closed ? t25("rankRealised") : t25("rankPosted")
    if (earned === 0) d.unavailable = t25("unavailable")
    else if (penaltyShare !== undefined) {
      d.grace = penaltyShare
      d.past = 0
      d.countClaim = t25("claim", { n: per100(penaltyShare) })
      d.countNote = t25("countNote", {
        penalty: amount(penaltyInterest),
        earned: amount(earned),
      })
      // The card's amber line: penalty interest above 5% of what lenders earned.
      const threshold = percentOf(String(amberLine))
      d.cov = [
        penaltyShare,
        amberLine,
        t25("cov.limit", { threshold }),
        penaltyShare > amberLine
          ? t25("cov.over", { points: score(penaltyShare - amberLine, 2) })
          : t25("cov.below", { points: score(amberLine - penaltyShare, 2) }),
        t25("cov.note", { threshold }),
      ]
    }
    if (earned && penaltyInterest !== undefined) {
      const w = widths([earned - penaltyInterest, penaltyInterest])
      d.buckets = [
        [t25("buckets.base"), amount(earned - penaltyInterest), w[0], GREEN],
        [t25("buckets.penalty"), amount(penaltyInterest), w[1], AMBER],
      ]
      d.bucketNote = t25("buckets.note")
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
        shared("trendFrom", {
          value: apr(first[1]),
          date: longDate(first[0]),
        }),
        latest(apr(last[1])),
        t25("trend", {
          changes: counted("rateChange", rates.length - 1),
          average: average === undefined ? NA : apr(average),
        }),
      ]
    }
    if (closed)
      d.sentence = t25("closedSentence", {
        realised: realised === undefined ? NA : apr(realised),
      })
    else {
      const pays = {
        base: base === undefined ? NA : apr(base),
        realised: realised === undefined ? "" : apr(realised),
        median: cmp.M39 ? percent(cmp.M39.median) : "",
      }
      if (realised !== undefined && cmp.M39)
        d.sentence = t25("sentenceRealisedMedian", pays)
      else if (realised !== undefined)
        d.sentence = t25("sentenceRealised", pays)
      else if (cmp.M39) d.sentence = t25("sentenceMedian", pays)
      else d.sentence = t25("sentence", pays)
    }
    d.parts = [
      [t25("parts.base"), base === undefined ? NA : apr(base)],
      [t25("parts.realised"), realised === undefined ? NA : apr(realised)],
      [
        t25("parts.penaltyShare"),
        penaltyShare === undefined ? NA : apr(penaltyShare),
      ],
      [
        t25("parts.penaltyApr"),
        n("M12") === undefined ? NA : penaltyRate(n("M12")!),
      ],
    ]
    d.sideBySide = [
      ...(closed ? [] : versus(t25("sideBySide.base"), base, cmp.M11, apr)),
      ...versus(t25("sideBySide.realised"), realised, cmp.M39, apr),
      ...versus(t25("sideBySide.penalty"), n("M12"), cmp.M12, penaltyRate),
    ]
    d.reasons = {
      ...(d.rank ? {} : reasonFor(["E", "I"], notRanked(railComparison))),
      ...(d.rail >= 0 && d.railMed < 0
        ? reasonFor(["K", "N"], t25("reasons.noMedian"))
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
    d.rankHigher = t26("rankHigher")
    if (capacity === 0) d.unavailable = t26("unavailable")
    else if (capacity !== undefined && used !== undefined) {
      const drawn = (used * capacity) / 100
      d.rail = one(used)
      d.railMed = cmp.M86 ? one(cmp.M86.median) : -1
      d.railMax = used > 100 ? railEnd(used) : undefined
      d.medText = cmp.M86 ? percent(cmp.M86.median) : undefined
      d.grace = Math.min(100, used)
      d.past = 0
      d.countClaim = t26("claim", { n: per100(used) })
      d.countNote = t26("countNote", {
        drawn: amount(drawn),
        capacity: amount(capacity),
      })
      d.cov = [
        used,
        100,
        t26("cov.limit"),
        used > 100
          ? t26("cov.over", { points: score(used - 100) })
          : t26("cov.room", { points: score(100 - used) }),
        t26("cov.note"),
      ]
      const w = widths([drawn, Math.abs(capacity - drawn)])
      d.buckets = [
        [t26("buckets.drawn"), amount(drawn), w[0], PURPLE],
        used > 100
          ? [t26("buckets.over"), amount(drawn - capacity), w[1], RED]
          : [t26("buckets.room"), amount(capacity - drawn), w[1], GHOST],
      ]
      d.bucketNote = t26("buckets.note")
      const line = {
        used: percent(used),
        drawn: amount(drawn),
        capacity: amount(capacity),
      }
      d.sentence = cmp.M86
        ? t26("sentenceMedian", {
            ...line,
            median: percent(cmp.M86.median),
          })
        : t26("sentence", line)
      d.parts = [
        [t26("parts.drawn"), amount(drawn)],
        [t26("parts.line"), amount(capacity)],
        [t26("parts.room"), amount(Math.max(0, capacity - drawn))],
      ]
      d.sideBySide = versus(t26("sideBySide.drawn"), used, cmp.M86, percent)
    }
    const utilization = seriesOf("UTILIZATION_HISTORY")
    if (utilization) {
      const first = utilization[0]
      const last = utilization[utilization.length - 1]
      const samples = sampleSeries(utilization)
      const { peak, heights } = scaled(samples, 100)
      d.trend = [
        heights,
        shared("trendOn", {
          value: percent(first[1]),
          date: longDate(first[0]),
        }),
        shared("trendNow", { value: percent(last[1]) }),
        t26("trend", { peak: percent(peak) }),
      ]
    }
    d.reasons = {
      ...(d.rank ? {} : reasonFor(["E", "I"], notRanked(cmp.M86))),
      ...(d.rail >= 0 && d.railMed < 0
        ? reasonFor(["K", "N"], t26("reasons.noMedian"))
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
    if (episodes === 0) d.unavailable = t28("unavailable")
    else if (buckets.every((value) => value !== undefined) && total > 0) {
      const [short, day, twoDays, longer] = buckets as number[]
      d.grace = (100 * twoDays) / total
      d.past = (100 * longer) / total
      d.countClaim = t28("claim", {
        n: per100((100 * (twoDays + longer)) / total),
      })
      d.countNote = t28("countNote", {
        overDay: count(twoDays + longer),
        total: count(total),
        longer: count(longer),
      })
      const shape = t28("sentence", {
        incidents: counted("finishedIncident", total),
        short: count(short),
        day: count(day),
        twoDays: count(twoDays),
        longer: count(longer),
      })
      d.sentence = open
        ? t28("stillOpen", { sentence: shape, count: open, n: count(open) })
        : shape
      const labels = [
        t28("lengths.under6"),
        t28("lengths.to24"),
        t28("lengths.to48"),
        t28("lengths.over48"),
      ]
      d.parts = [
        [labels[0], count(short)],
        [labels[1], count(day)],
        [labels[2], count(twoDays)],
        [labels[3], count(longer)],
      ]
      const w = widths([short, day, twoDays, longer])
      d.buckets = [
        [labels[0], count(short), w[0], GREEN],
        [labels[1], count(day), w[1], AMBER],
        [labels[2], count(twoDays), w[2], RED],
        [labels[3], count(longer), w[3], DEEP_RED],
      ]
    }
    // Share of finished incidents cured within grace (M83).
    if (cured !== undefined) {
      d.rail = one(cured)
      d.better = "higher"
      d.railMed = cmp.M83 ? one(cmp.M83.median) : -1
      d.railValue = t28("railValue", { cured: percent(cured) })
      d.medText = cmp.M83 ? percent(cmp.M83.median) : undefined
    }
    // The average finished incident against the allowance.
    if (finished && average !== undefined && grace) {
      const over = average > grace
      d.cov = [
        average,
        grace,
        graceLimit(grace),
        over
          ? shared("pastLimit", { hours: hours(average - grace) })
          : t28("cov.room", { hours: hours(grace - average) }),
        t28("cov.note"),
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
        lifeEndLabel(lifeEnd),
        t28("trend", { spans: TREND_BARS, peak: counted("incident", peak) }),
      ]
    }
    d.sideBySide = [
      ...versus(t28("sideBySide.cured"), cured, cmp.M83, percent),
      ...versus(t28("sideBySide.average"), average, cmp.M22, hours),
      ...versus(t28("sideBySide.finished"), finished, cmp.M20, count),
    ]
    const onlyOpen = t28("reasons.onlyOpen")
    d.reasons = {
      ...(d.grace < 0 ? reasonFor(["B", "G", "L"], onlyOpen) : {}),
      ...(d.rail < 0 ? reasonFor(["C", "H", "K", "N"], onlyOpen) : {}),
      ...(d.rail >= 0 && d.railMed < 0
        ? reasonFor(["K", "N"], t28("reasons.noMedian"))
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
    d.rankHigher = t29("rankHigher")
    if (ever === 0) d.unavailable = t29("unavailable")
    else {
      if (largest !== undefined) {
        d.grace = largest
        d.past = 0
        d.countClaim = t29("claim", { n: per100(largest) })
        d.countNote =
          active !== undefined && ever !== undefined
            ? t29("countNoteActive", {
                largest: percent(largest),
                active: count(active),
                ever: count(ever),
              })
            : t29("countNote", { largest: percent(largest) })
        d.split = [
          [largest, PURPLE],
          [Math.max(0, 100 - largest), GHOST],
        ]
      }
      if (retention !== undefined) {
        d.rail = one(retention)
        d.railMed = cmp.M51 ? one(cmp.M51.median) : -1
        d.railValue = t29("railValue", { retention: percent(retention) })
        d.medText = cmp.M51 ? percent(cmp.M51.median) : undefined
      }
      if (active !== undefined && ever !== undefined) {
        const lenders = { active: count(active), ever: count(ever) }
        d.sentence =
          largest === undefined
            ? t29("sentence", lenders)
            : t29("sentenceLargest", {
                ...lenders,
                largest: percent(largest),
              })
        const w = widths([active, ever - active])
        d.buckets = [
          [t29("buckets.holding"), count(active), w[0], GREEN],
          [t29("buckets.left"), count(ever - active), w[1], GHOST],
        ]
        d.bucketNote = t29("buckets.note")
      }
      d.parts = [
        [t29("parts.active"), active === undefined ? NA : count(active)],
        [t29("parts.ever"), ever === undefined ? NA : count(ever)],
        [t29("parts.biggest"), largest === undefined ? NA : percent(largest)],
        [
          t29("parts.retention"),
          retention === undefined ? NA : percent(retention),
        ],
      ]
    }
    const lenders = seriesOf("LENDERS_TO_DATE")
    if (lenders && ever) {
      const samples = sampleSeries(lenders, true)
      const { heights } = scaled(samples)
      d.trend = [
        heights,
        shared("trendBy", {
          value: counted("lender", lenders[0][1]),
          date: longDate(lenders[0][0]),
        }),
        shared("trendNow", { value: count(lenders[lenders.length - 1][1]) }),
        t29("trend"),
      ]
    }
    d.sideBySide = [
      ...versus(t29("sideBySide.ever"), ever, cmp.M49, count),
      ...versus(t29("sideBySide.holding"), retention, cmp.M51, percent),
      ...versus(t29("sideBySide.largest"), largest, cmp.D10, percent),
    ]
    d.reasons = {
      ...(d.rank ? {} : reasonFor(["E", "I"], notRanked(cmp.M49))),
      ...(d.rail >= 0 && d.railMed < 0
        ? reasonFor(
            ["K", "N"],
            closed ? t29("reasons.closed") : t29("reasons.noMedian"),
          )
        : {}),
      M: t29("reasons.M"),
      ...(d.trend ? {} : { O: seriesReason(market.values.LENDERS_TO_DATE) }),
    }
    data["2.9"] = d
  }

  // ---------- 2.10 Terms ----------
  if (specs["2.10"]) {
    const d = datumFromSpec(specs["2.10"], evidence)
    const window = n("M16")
    const reserve = n("M14")
    const penalty = n("M12")
    const penaltyText = (value: number) =>
      t210("penaltyApr", { rate: penaltyRate(value) })
    if (grace !== undefined) {
      d.rail = one(grace)
      d.railMed = cmp.M15 ? one(cmp.M15.median) : -1
      d.railMax = railEnd(grace, cmp.M15?.median ?? 0)
      d.medText = cmp.M15 ? hours(cmp.M15.median) : undefined
    }
    d.rank = positionOf(cmp.M15)
    d.rankHigher = t210("rankHigher")
    const shown = {
      lifecycle: lifecycle(s("M77")),
      grace: grace === undefined ? NA : hours(grace),
      window: window === undefined ? NA : hours(window),
      reserve: reserve === undefined ? NA : percent(reserve),
      penalty: penalty === undefined ? NA : penaltyText(penalty),
    }
    d.parts = [
      [t210("parts.lifecycle"), shown.lifecycle],
      [t210("parts.allowed"), shown.grace],
      [t210("parts.window"), shown.window],
      [t210("parts.reserve"), shown.reserve],
      [t210("parts.penalty"), shown.penalty],
    ]
    d.sideBySide = [
      ...versus(t210("parts.allowed"), grace, cmp.M15, hours),
      ...versus(t210("parts.window"), window, cmp.M16, hours),
      ...versus(t210("parts.reserve"), reserve, cmp.M14, percent),
      ...versus(t210("parts.penalty"), penalty, cmp.M12, penaltyText),
    ]
    d.sentence = t210("sentence", shown)
    d.reasons = {
      ...reasonFor(["B", "G"], t210("reasons.count")),
      ...(d.rank ? {} : reasonFor(["E", "I"], notRanked(cmp.M15))),
      ...(d.rail >= 0 && d.railMed < 0
        ? reasonFor(["K", "N"], t210("reasons.noMedian"))
        : {}),
      L: t210("reasons.L"),
      M: t210("reasons.M"),
      O: t210("reasons.O"),
    }
    data["2.10"] = d
  }

  Object.values(data).forEach((d) => {
    if (!d.sentence)
      // eslint-disable-next-line no-param-reassign
      d.sentence = d.unit
        ? shared("sentenceUnit", { name: d.name, value: d.value, unit: d.unit })
        : shared("sentence", { name: d.name, value: d.value })
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
  CARD_IDS.includes(card) ? cardCopy(card).name : `card ${card}`

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
  B: text("treatments.tiles.fallback.B"),
  G: text("treatments.tiles.fallback.G"),
  C: text("treatments.tiles.fallback.C"),
  H: text("treatments.tiles.fallback.H"),
  J: text("treatments.tiles.fallback.J"),
  E: text("treatments.tiles.fallback.E"),
  I: text("treatments.tiles.fallback.I"),
  K: text("treatments.tiles.fallback.K"),
  N: text("treatments.tiles.fallback.N"),
  L: text("treatments.tiles.fallback.L"),
  M: text("treatments.tiles.fallback.M"),
  O: text("treatments.tiles.fallback.O"),
}

/** Rendering a shape is not sufficient evidence that it is a valid choice. */
export const referenceReason = (card: string, code: TreatmentCode) => {
  if (code === "J") return text("treatments.tiles.reference.gauge")
  if (
    ["2.4", "3.4"].includes(card) &&
    ["B", "C", "G", "H", "K", "N"].includes(code)
  )
    return text("treatments.tiles.reference.state")
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
export const findTreatmentCard = (query: string) => {
  const match = query.trim().match(/^(?:card\s*)?(\d+\.\d+)$/i)
  return match && TREATMENT_CARDS.includes(match[1]) ? match[1] : undefined
}
