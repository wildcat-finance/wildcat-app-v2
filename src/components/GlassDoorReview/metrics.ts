// Temporary: the metric review page (product#917). Remove with the page.
//
// What the review page shows for one metric: its group, its value for the
// selection (or the reason it has none), its published comparison and the card
// copy of the cards it feeds. Copy comes from the catalogue and the live
// cards, never written here.

import type {
  BorrowerAnalytics,
  Comparison,
  MarketAnalytics,
  MetricValue,
  MetricValues,
} from "@/components/GlassDoor/api"
import {
  ageDays,
  apr,
  contractKept,
  count,
  days,
  hours,
  isNumber,
  lifeShare,
  percent,
  score,
  trend,
  units,
} from "@/components/GlassDoor/format"
import { isoDay, lifecycle, yesNo } from "@/components/GlassDoor/helpers"
import { GATES } from "@/components/GlassDoor/rules"
import { CARDS, metric as metricLabel } from "@/components/GlassDoor/wording"

import { SPEC_METRICS, SPEC_SOURCE, SpecMetric } from "./catalogue"

export type Group = "borrower" | "market"

export const GROUPS: { key: Group; title: string }[] = [
  { key: "borrower", title: "Borrower metrics" },
  { key: "market", title: "Market metrics" },
]

// The sheet's prefixes: S is one borrower across all their markets, M one
// market. Derived ids follow the record that publishes them; D11 is the
// borrower header's defaults badge.
const BORROWER_DERIVED = new Set(["D11", "D15", "D16", "D21"])

export const groupOf = (id: string): Group =>
  id.startsWith("S") || BORROWER_DERIVED.has(id) ? "borrower" : "market"

export const metricsIn = (group: Group) =>
  SPEC_METRICS.filter((metric) => groupOf(metric.id) === group)

/** One read of the selection, as the page holds it. */
export type Source<T> =
  | { status: "none" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "preparing" }
  | { status: "unavailable" }
  | { status: "ok"; data: T }

export type ReviewData = {
  market: Source<MarketAnalytics>
  borrower: Source<BorrowerAnalytics>
  /** Market type labels (G4), read from the market's hooks and app data. */
  typeLabels?: string[]
  typeLabelsLoading?: boolean
}

export type Shown =
  | { kind: "loading" }
  | { kind: "tbd"; reason: string }
  | { kind: "value"; text: string; raw?: MetricValue }

const NOUN: Record<Group, string> = { market: "market", borrower: "borrower" }

/** Why a record cannot be read yet, or undefined when it can. */
export const recordGap = (
  source: Source<MarketAnalytics | BorrowerAnalytics>,
  group: Group,
): Shown | undefined => {
  const noun = NOUN[group]
  switch (source.status) {
    case "none":
      return { kind: "tbd", reason: `Select a ${noun} to see its value` }
    case "loading":
      return { kind: "loading" }
    case "error":
      return {
        kind: "tbd",
        reason: `Not loaded: the ${noun} analytics request failed`,
      }
    case "preparing":
      return {
        kind: "tbd",
        reason: `Being prepared: this ${noun}'s history is still being built`,
      }
    case "unavailable":
      return {
        kind: "tbd",
        reason: `No record: Glass Door has none for this ${noun} on this network`,
      }
    default:
  }
  const record = source.data
  if (record.state === "Preparing")
    return {
      kind: "tbd",
      reason: `Being prepared: this ${noun} is not published yet`,
    }
  if (record.state === "UnderReview" || !Object.keys(record.values).length)
    return {
      kind: "tbd",
      // The review reason shows once, under the group heading (reviewReason).
      reason: `Withheld: this ${noun} is under review`,
    }
  return undefined
}

/** A record's under-review reason, shown once per group. */
export const reviewReason = (
  source: Source<MarketAnalytics | BorrowerAnalytics>,
) =>
  source.status === "ok" &&
  source.data.state === "UnderReview" &&
  source.data.reason
    ? source.data.reason
    : undefined

const pointsChange = (value: number) =>
  `${value < 0 ? "−" : "+"}${lifeShare(Math.abs(value)).replace("%", "")} pp`

const seconds = (value: number) =>
  `${count(value)} s = ${score(value / 86_400)} days`

const tokenAmount = (value: number, asset?: string) =>
  `${units(value)}${asset ? ` ${asset}` : ""}`

type Format = (value: number, asset?: string) => string

// Published units follow cheat sheet v4.2: Longest episode, all markets (D15)
// in hours, Penalty seconds in the quiet window (H09) in seconds.
const NUMBER_FORMAT: Record<string, Format> = {
  M05: ageDays,
  M06: tokenAmount,
  M07: tokenAmount,
  M08: tokenAmount,
  M11: apr,
  M12: pointsChange,
  M13: (v) => percent(v),
  M14: (v) => percent(v),
  M15: (v) => hours(v),
  M16: (v) => hours(v),
  M18: (v) => score(v),
  M20: count,
  M21: (v) => `${yesNo(v)} (${count(v)})`,
  M22: (v) => hours(v),
  M23: (v) => hours(v),
  M24: (v) => percent(v),
  M25: count,
  M26: lifeShare,
  M27: tokenAmount,
  M30: count,
  M31: count,
  M32: (v) => percent(v),
  M33: (v) => percent(v),
  M37: count,
  M38: tokenAmount,
  M39: apr,
  M40: apr,
  M41: tokenAmount,
  M42: lifeShare,
  M44: count,
  M48: count,
  M49: count,
  M51: (v) => percent(v),
  M56: tokenAmount,
  M57: tokenAmount,
  M58: tokenAmount,
  M59: count,
  M60: count,
  M67: (v) => score(v),
  M68: trend,
  M69: count,
  M70: count,
  M71: count,
  M72: count,
  M80: (v) => hours(v),
  M82: (v) => hours(v),
  M83: (v) => percent(v),
  M84: days,
  M85: (v) => `${yesNo(v)} (${count(v)})`,
  M86: (v) => percent(v),
  S01: count,
  S05: (v) => score(v),
  S06: (v) => score(v),
  S07: (v) => score(v),
  S12: count,
  S13: count,
  S14: count,
  S15: count,
  S16: (v) => percent(v),
  S17: (v) => percent(v),
  S18: count,
  S27: (v) => score(v),
  S28: trend,
  S30: count,
  // Book sums can mix assets, so they carry no symbol.
  S31: (v) => units(v),
  S32: (v) => percent(v),
  S33: count,
  S34: count,
  S35: (v) => units(v),
  S36: (v) => units(v),
  S37: count,
  D03: tokenAmount,
  // Grace countdown: hours left while late within grace (else a phrase).
  D05: (v) => `${hours(v)} left`,
  D10: (v) => percent(v),
  D15: (v) => hours(v),
  D16: (v) => hours(v),
  D17: days,
  D21: contractKept,
  H01: seconds,
  H02: seconds,
  H08: seconds,
  H09: seconds,
}

const TEXT_FORMAT: Record<
  string,
  (text: string, values: MetricValues) => string
> = {
  M01: (symbol, values) =>
    typeof values.MARKET_NAME === "string" && values.MARKET_NAME
      ? `${symbol} (${values.MARKET_NAME})`
      : symbol,
  M03: (day) => isoDay(day),
  M77: (status) => lifecycle(status),
  S02: (day) => isoDay(day),
}

/** A published value in the design's number rules; undefined when blank. */
export const formatValue = (
  id: string,
  value: MetricValue | undefined,
  values: MetricValues = {},
) => {
  const asset =
    typeof values.M02 === "string" && values.M02 ? values.M02 : undefined
  if (isNumber(value))
    return (NUMBER_FORMAT[id] ?? ((number: number) => score(number)))(
      value,
      asset,
    )
  if (typeof value === "string" && value !== "")
    return TEXT_FORMAT[id]?.(value, values) ?? value
  return undefined
}

/** Ids the publication does not carry, each with its reason. */
const NOT_PUBLISHED: Record<string, string> = {
  D11: "Not published: defaults on record come from off-chain app data (the defaults badge), not from the Glass Door publication",
}

const noFundedMarket = (values: MetricValues) =>
  Number(values.S01 ?? 0) === 0
    ? "None yet: no funded market"
    : "None yet: no recorded history across the funded markets"

/** Why the metrics that can be blank are blank, by their own rules. */
const BLANK_REASON: Record<string, (values: MetricValues) => string> = {
  M67: (values) => {
    if (Number(values.H01 ?? 0) === 0) return "None yet: no recorded history"
    if (values.M77 === "Closed")
      return "None after closure: the last 90 days hold no recorded time"
    return "None: under 7 days recorded in the last 90 days"
  },
  M83: () => "None yet: no finished episode to have been cured",
  S02: noFundedMarket,
  S05: noFundedMarket,
  S06: noFundedMarket,
  S07: noFundedMarket,
  D21: noFundedMarket,
  S32: noFundedMarket,
  S17: () => "None yet: no market has reached a payout deadline",
  S27: (values) =>
    Number(values.S01 ?? 0) === 0
      ? "None yet: no funded market"
      : "None: under 7 days recorded across the book in the last 90 days",
}
BLANK_REASON.M68 = BLANK_REASON.M67
BLANK_REASON.S28 = BLANK_REASON.S27

/** The value for the selection, or the reason it has none. */
export const shownValue = (metric: SpecMetric, data: ReviewData): Shown => {
  const group = groupOf(metric.id)
  if (metric.id === "G4") {
    const gap = recordGap(data.market, "market")
    if (gap && data.market.status !== "ok") return gap
    if (data.typeLabels?.length)
      return { kind: "value", text: data.typeLabels.join(" · ") }
    if (data.typeLabelsLoading) return { kind: "loading" }
    return {
      kind: "tbd",
      reason: "Not read: the market's hooks could not be read from the chain",
    }
  }
  if (NOT_PUBLISHED[metric.id])
    return { kind: "tbd", reason: NOT_PUBLISHED[metric.id] }
  const source = group === "market" ? data.market : data.borrower
  const gap = recordGap(source, group)
  if (gap || source.status !== "ok")
    return gap ?? { kind: "tbd", reason: "Not loaded" }
  const { values } = source.data
  if (!(metric.id in values))
    return {
      kind: "tbd",
      reason: "Not published: not in the current publication",
    }
  const raw = values[metric.id]
  const text = formatValue(metric.id, raw, values)
  if (text === undefined)
    return {
      kind: "tbd",
      reason:
        BLANK_REASON[metric.id]?.(values) ??
        `No value: none published for this ${NOUN[group]}`,
    }
  return { kind: "value", text, raw }
}

/** The published comparison for this metric, from its own record. */
export const comparisonOf = (
  metric: SpecMetric,
  data: ReviewData,
): Comparison | undefined => {
  const source = groupOf(metric.id) === "market" ? data.market : data.borrower
  return source.status === "ok" ? source.data.comparisons[metric.id] : undefined
}

const POPULATION: Record<Group, string> = {
  market: "markets",
  borrower: "borrowers",
}

/** The Comparison part: median, population and rank, as published. */
export const comparisonText = (metric: SpecMetric, data: ReviewData) => {
  const group = groupOf(metric.id)
  const source = group === "market" ? data.market : data.borrower
  const gap = recordGap(source, group)
  if (gap?.kind === "loading") return "loading…"
  if (gap?.kind === "tbd") return gap.reason
  const comparison = comparisonOf(metric, data)
  if (!comparison)
    return "No comparison published for this metric at this snapshot"
  const noun = POPULATION[group]
  const median =
    formatValue(metric.id, comparison.median) ?? score(comparison.median)
  const age =
    group === "market" && source.status === "ok"
      ? source.data.values.M05
      : undefined
  let rank = `no rank is published for this ${NOUN[group]}`
  if (comparison.betterThan !== undefined)
    rank = `better than ${count(comparison.betterThan)} of ${count(
      comparison.population,
    )} graded ${noun}`
  else if (isNumber(age) && age < GATES.gradeDays)
    rank = `ranked once it has ${
      GATES.gradeDays
    } days of record; it has ${count(age)}`
  return `median ${median} across ${count(
    comparison.population,
  )} graded ${noun}; ${rank}`
}

/** Card numbers among Used on cards ("2.1"), without header and table. */
export const cardNumbers = (metric: SpecMetric) =>
  metric.cards.filter((card) => /^\d+\.\d+$/.test(card))

/** The spec has no per-metric tells; the page says so once and shows the card copy. */
export const COPY_NOTE = `What a metric tells and does not tell is not in the metric spec (${SPEC_SOURCE.replace(
  "Wildcat analytics ",
  "",
)}); the spec section shows the copy of the cards it feeds.`

export type CardCopyLine = { card: string; name?: string; text?: string }

/** The handoff's card copy for each card the metric feeds (cards.json). */
export const cardCopy = (
  metric: SpecMetric,
  part: "tells" | "notTells",
): CardCopyLine[] =>
  cardNumbers(metric).map((card) => {
    const copy = CARDS[card]
    return copy ? { card, name: copy.name, text: copy[part] } : { card }
  })

/** Where the metric also shows besides cards. */
export const PLACES: Record<string, string> = {
  header: "the page header",
  table: "the per-market table",
}

const paddedId = (text: string) => {
  const match = text.match(/^([a-z])(\d+)$/i)
  if (!match) return undefined
  const letter = match[1].toUpperCase()
  return [`${letter}${match[2]}`, `${letter}${match[2].padStart(2, "0")}`]
}

/**
 * The metric a "Go to metric" entry names: its full label, its id ("m18",
 * "M1" for M01) or the first name containing the text.
 */
export const findMetric = (text: string) => {
  const query = text.trim().replace(/^\((.*)\)$/, "$1")
  if (!query) return undefined
  const lower = query.toLowerCase()
  const byLabel = SPEC_METRICS.find(
    (metric) => metricLabel(metric.id).toLowerCase() === lower,
  )
  if (byLabel) return byLabel.id
  const ids = paddedId(query)
  const byId = ids && SPEC_METRICS.find((metric) => ids.includes(metric.id))
  if (byId) return byId.id
  return SPEC_METRICS.find((metric) =>
    metricLabel(metric.id).toLowerCase().includes(lower),
  )?.id
}
