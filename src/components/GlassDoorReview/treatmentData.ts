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
  lifeShare,
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
  /** [better than, population] for E and I. */
  rank: [number, number] | null
  parts: [string, string][]
  split?: [number, string][]
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
}

export const TREATMENTS = {
  A: {
    label: "Grade card",
    summary:
      "value, verdict, median line (the shipped default for 2.1, 2.2, 2.3)",
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
      "status-page segments; unordered, because the chain holds counts not a series",
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
    summary: "this market against the market average",
  },
  O: { label: "Trend", summary: "the series, where one exists" },
  P: {
    label: "Exception line",
    summary: "credit-queue item with a flag and a next step",
  },
} as const

export type TreatmentCode = keyof typeof TREATMENTS
export const TREATMENT_CODES = Object.keys(TREATMENTS) as TreatmentCode[]

/** The market cards the handoff draws treatments for. */
export const TREATMENT_CARDS = [
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

/** The shipped pages use A, the grade card, for the graded cards. */
export const DESIGN_TREATMENT: Record<string, TreatmentCode> = {
  "2.1": "A",
  "2.2": "A",
  "2.3": "A",
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

const start = (spec: CardSpec, evidence?: string): IndexDatum => ({
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
  const hasRecord = life !== undefined && life > 0
  const finished = n("M20")
  const open = openEpisodes(market.values)
  const episodes = finished === undefined ? undefined : finished + open
  const data: Record<string, IndexDatum> = {}

  // ---------- 2.1 In order ----------
  if (specs["2.1"]) {
    const d = start(specs["2.1"], evidence)
    const cash = n("M18")
    const penalty = hasRecord ? n("M26") : undefined
    d.rank = rankOf(cmp.M18)
    if (life === 0) d.unavailable = "No recorded history yet."
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
      d.railMed = cmp.M18 ? one(cmp.M18.median) : -1
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
    }
    data["2.1"] = d
  }

  // ---------- 2.2 Worst incident ----------
  if (specs["2.2"]) {
    const d = start(specs["2.2"], evidence)
    const longest = n("M23")
    const worst = n("M24")
    d.unavailable =
      "A single event, not a rate: nothing to count out of 100. Nearest honest form: the worst incident against the allowance (treatment M)."
    d.rank = rankOf(cmp.M24)
    if (hasRecord && grace && worst !== undefined) {
      d.rail = one(worst)
      d.railMed = cmp.M24 ? one(cmp.M24.median) : -1
      d.railMax = Math.max(120, Math.ceil(worst / 10) * 10 + 10)
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
    d.parts = [
      ["longest incident", longest === undefined ? NA : hours(longest)],
      ["allowed lateness", grace === undefined ? NA : hours(grace)],
      ["breaches", "TBD: recount open (B2)"],
      ["penalty interest paid", amount(n("M27"))],
    ]
    data["2.2"] = d
  }

  // ---------- 2.3 Exits paid on time ----------
  if (specs["2.3"]) {
    const d = start(specs["2.3"], evidence)
    const deadlines = n("M30")
    const covered = n("M31")
    const rate = n("M32")
    const paidLate = n("D18_LATE")
    const unpaid = n("D18_NEVER")
    const queued = n("M37")
    const unclaimed = n("M38")
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
      d.railMed = cmp.M32 ? one(cmp.M32.median) : -1
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
          : "split of late vs never coming soon"
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
    }
    data["2.3"] = d
  }

  // ---------- 2.4 Right now ----------
  if (specs["2.4"]) {
    const spec = specs["2.4"]
    const d = start(spec, evidence)
    const state = spec.state ?? "neutral"
    const countdown = n("D05") ?? leadingNumber(s("D05"))
    const waiting = n("M37")
    const cured = n("M84")
    d.verdict = STATE_TONE[state]
    const { protocol } = market
    if (state !== "neutral" && protocol && protocol.openMarkets > 0) {
      d.rail = state === "green" ? 100 : 0
      d.railMed = one(
        (100 * (protocol.openMarkets - protocol.lateNow)) /
          protocol.openMarkets,
      )
    }
    if (state === "green") {
      d.grace = 0
      d.past = 0
      d.countClaim = "Nothing late now: all 100 in order."
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
    d.parts = [
      ["late within grace now", yesNo(n("M21"))],
      ["past grace now", yesNo(n("M85"))],
      ["open batches", waiting === undefined ? NA : count(waiting)],
      ["last cure", cured === undefined ? NA : `${ageDays(cured)} ago`],
    ]
    data["2.4"] = d
  }

  // ---------- 2.5 What it pays ----------
  if (specs["2.5"]) {
    const spec = specs["2.5"]
    const d = start(spec, evidence)
    const base = n("M11")
    const average = n("M40")
    const realised = n("M39")
    const earned = n("M41")
    const penaltyShare = n("M42")
    d.verdict = spec.flag && spec.flagTone === "watch" ? "WATCH" : "CONTEXT"
    d.rank = rankOf(cmp.M39)
    if (earned === 0) d.unavailable = "No lender interest has accrued yet."
    else if (penaltyShare !== undefined) {
      d.grace = penaltyShare
      d.past = 0
      d.countClaim = `${per100(
        penaltyShare,
      )} of every 100 dollars lenders earned came from penalty interest.`
      d.countNote = `penalty interest ${amount(n("M27"))} of ${amount(
        earned,
      )} earned (M42)`
    }
    if (!closed && base !== undefined && average !== undefined) {
      const max = Math.max(base, average)
      d.trend = [
        max > 0 ? [(100 * average) / max, (100 * base) / max] : [0, 0],
        `lifetime average ${apr(average)}`,
        `now ${apr(base)}`,
        "two endpoints only: the publication holds the time-weighted average and today's rate, not the path between",
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
    data["2.5"] = d
  }

  // ---------- 2.6 How the line is used ----------
  if (specs["2.6"]) {
    const d = start(specs["2.6"], evidence)
    const capacity = n("M06")
    const used = n("M86")
    if (capacity === 0)
      d.unavailable = "No deposit capacity: the market has no line to draw on."
    else if (capacity !== undefined && used !== undefined) {
      const drawn = (used * capacity) / 100
      d.rail = one(used)
      d.railMed = cmp.M86 ? one(cmp.M86.median) : -1
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
    }
    data["2.6"] = d
  }

  // ---------- 2.8 Incident history ----------
  if (specs["2.8"]) {
    const d = start(specs["2.8"], evidence)
    const buckets = ["M69", "M70", "M71", "M72"].map((id) => n(id))
    const total = buckets.reduce<number>((sum, value) => sum + (value ?? 0), 0)
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
    data["2.8"] = d
  }

  // ---------- 2.9 Who funds it ----------
  if (specs["2.9"]) {
    const d = start(specs["2.9"], evidence)
    const active = n("M48")
    const ever = n("M49")
    const largest = n("D10")
    const retention = n("M51")
    d.rank = rankOf(cmp.M49)
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
      }
      if (active !== undefined && ever !== undefined)
        d.sentence = `${count(active)} lenders are active of ${count(
          ever,
        )} who ever deposited${
          largest === undefined ? "" : `; the biggest holds ${percent(largest)}`
        }.`
      d.parts = [
        ["active now", active === undefined ? NA : count(active)],
        ["ever", ever === undefined ? NA : count(ever)],
        ["biggest holder", largest === undefined ? NA : percent(largest)],
        ["retention", retention === undefined ? NA : percent(retention)],
      ]
    }
    data["2.9"] = d
  }

  // ---------- 2.10 Terms ----------
  if (specs["2.10"]) {
    const d = start(specs["2.10"], evidence)
    const window = n("M16")
    const reserve = n("M14")
    const penaltyRate = n("M12")
    d.unavailable =
      "Contract facts, not a measured rate. Nearest honest form: the parts list in treatment F."
    d.parts = [
      ["lifecycle", lifecycle(s("M77"))],
      ["allowed lateness", grace === undefined ? NA : hours(grace)],
      ["payout window", window === undefined ? NA : hours(window)],
      ["reserve ratio", reserve === undefined ? NA : percent(reserve)],
      [
        "penalty",
        penaltyRate === undefined ? NA : `+${score(penaltyRate, 2)} APR`,
      ],
    ]
    d.sentence = `${lifecycle(s("M77"))}: lateness tolerated for ${
      grace === undefined ? NA : hours(grace)
    }, payouts due within ${window === undefined ? NA : hours(window)}, a ${
      reserve === undefined ? NA : percent(reserve)
    } reserve ratio, and a penalty of ${
      penaltyRate === undefined ? NA : `+${score(penaltyRate, 2)} APR`
    } once past the allowance.`
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
 * Choosing the chosen tile again, or the design default, goes back to the
 * design default; any other tile becomes the card's choice.
 */
export const choose = (
  picks: TreatmentPicks,
  card: string,
  code: TreatmentCode,
): TreatmentPicks => {
  const next = { ...picks }
  if (code === chosenTreatment(picks, card) || code === DESIGN_TREATMENT[card])
    delete next[card]
  else next[card] = code
  return next
}

/** One line per card, for the summary and its copy. */
export const treatmentLines = (picks: TreatmentPicks) =>
  TREATMENT_CARDS.map((card) => {
    const code = chosenTreatment(picks, card)
    const { name } = CARDS[card as keyof typeof CARDS]
    let choice = "the card as designed, no treatment chosen"
    if (code)
      choice = `${card}-${code} ${TREATMENTS[code].label}${
        picks[card] ? " (changed)" : " (design default)"
      }`
    return { card, text: `${card} ${name}: ${choice}`, changed: !!picks[card] }
  })
