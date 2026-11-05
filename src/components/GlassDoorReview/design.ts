// Temporary: the metric review page (product#917). Remove with the page.
//
// How the design handoff (product#908) shows each metric, so every metric
// starts from its design default and says why:
// - Card: the metric appears on a card, including supporting values.
// - Chart: the metric is an input of that card's chart (README, "Charts").
// - Comparison: the pipeline publishes a median and rank for it
//   (src/lib/glassdoor/pipeline/comparisons.ts).
// Value is on for every metric.

import { SpecMetric } from "./catalogue"
import { cardNumbers, PLACES } from "./metrics"
import type { OptionKey } from "./options"
import { TREATMENT_CARDS } from "./treatmentData"

/** Card headline values in cards.json, by the metric that carries them. */
export const HEADLINES: Record<string, string[]> = {
  "2.1": ["M18"],
  "2.2": ["M24"],
  "2.3": ["M32"],
  // A state card: its headline is read from both flags.
  "2.4": ["M21", "M85"],
  "2.5": ["M11"],
  "2.6": ["M86"],
  "2.8": ["M20"],
  // "251 of 591".
  "2.9": ["M48", "M49"],
  "2.10": ["M15"],
  "3.1": ["S05"],
  "3.4": ["S18", "S35", "S36"],
  "3.6": ["S30"],
  "3.8": ["S13"],
  "3.10": ["S37"],
}

/** Chart inputs per card, from the README's chart table. */
export const CHART_INPUTS: Record<string, string[]> = {
  "2.1": ["M18", "M26", "M67"],
  "2.2": ["M23", "M15"],
  "2.3": ["M30", "M31", "M58", "M08", "M38"],
  "2.4": ["M21", "M85", "D05", "M84", "M37"],
  "2.5": ["M42", "M27", "M41"],
  "2.6": ["M86", "M07"],
  "2.8": ["M69", "M70", "M71", "M72", "M15"],
  "2.9": ["M49", "M48"],
  "3.1": ["M18", "M05", "S05"],
  "3.4": ["S18", "S35", "S36"],
  "3.6": ["S32", "S31"],
  "3.8": ["S13", "S12"],
  "3.12": ["H02", "H08", "H01", "M26", "D17"],
}

/** Metrics the pipeline compares (median and rank), as comparisons.ts lists. */
export const COMPARED = new Set([
  "M18",
  "M26",
  "M24",
  "M32",
  "M33",
  "M22",
  "M39",
  "M20",
  "M49",
  "M11",
  "M86",
  "M51",
  "D10",
  "S05",
  "D21",
  "S16",
  "D16",
  "S01",
  "S12",
  "S37",
])

const cardsWhere = (table: Record<string, string[]>, id: string) =>
  Object.entries(table)
    .filter(([, ids]) => ids.includes(id))
    .map(([card]) => card)

export type DesignRole = {
  /** Cards whose headline value this metric is. */
  headline: string[]
  /** Other cards that use it (sub-lines, formulas, panels). */
  supporting: string[]
  /** Cards whose chart plots it. */
  charts: string[]
  compared: boolean
  /** "the page header", "the per-market table". */
  places: string[]
}

export const designRole = (metric: SpecMetric): DesignRole => {
  const headline = cardsWhere(HEADLINES, metric.id)
  return {
    headline,
    supporting: cardNumbers(metric).filter((card) => !headline.includes(card)),
    charts: cardsWhere(CHART_INPUTS, metric.id),
    compared: COMPARED.has(metric.id),
    places: metric.cards
      .filter((card) => PLACES[card])
      .map((card) => PLACES[card]),
  }
}

/** 3.12 Trouble over time is a chart section, not a seven-field card. */
const CHART_SECTIONS = new Set(["3.12"])

/** The seven-field cards the metric appears on, headline first. */
export const cardsOf = (metric: SpecMetric) => {
  const role = designRole(metric)
  return [...role.headline, ...role.supporting].filter(
    (card) => !CHART_SECTIONS.has(card),
  )
}

/**
 * The options a metric can have at all: a card, chart or comparison only
 * when the design has one for it. Value is always available.
 */
export const optionsFor = (metric: SpecMetric): OptionKey[] => {
  const role = designRole(metric)
  return [
    "value",
    ...(cardsOf(metric).length ? (["card"] as const) : []),
    ...(role.charts.length ? (["chart"] as const) : []),
    ...(role.compared ? (["comparison"] as const) : []),
  ]
}

/** Start with every supported display, including cards the metric feeds. */
export const designDefault = optionsFor

/** The reviewable market or borrower card this metric heads. */
export const treatmentCardOf = (metric: SpecMetric) =>
  designRole(metric).headline.find((card) => TREATMENT_CARDS.includes(card))

/** No card, chart, comparison or treatments: a value and nothing more. */
export const isValueOnly = (metric: SpecMetric) =>
  optionsFor(metric).length === 1 && !treatmentCardOf(metric)

/** What a metric can show, in words, for the sidebar list. */
export const availabilityText = (metric: SpecMetric) => {
  const role = designRole(metric)
  const cards = cardsOf(metric)
  const treatmentCard = treatmentCardOf(metric)
  const parts = [
    cards.length
      ? `Card ${cards
          .map((card) =>
            role.headline.includes(card) ? `${card} headline` : card,
          )
          .join(", ")}`
      : undefined,
    role.charts.length ? `Chart ${role.charts.join(", ")}` : undefined,
    role.compared ? "Comparison" : undefined,
    treatmentCard ? `16 treatments (card ${treatmentCard})` : undefined,
  ].filter(Boolean)
  return parts.length ? parts.join(" · ") : "Value only"
}
