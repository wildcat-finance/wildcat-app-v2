// Temporary: the metric review page (product#917). Remove with the page.
//
// The metric dictionary as the review page lists it. Each metric's name and
// definition (what it is, how it is computed, where from, its unit) are the
// master copy in src/locales/en/glassDoor.json under metrics. This file adds
// what that copy does not hold: the cheat sheet's worked example and the cards
// each metric is used on.

import { metricDefinition } from "@/components/GlassDoor/text"

export type SpecMetric = {
  id: string
  name: string
  /** What it is. */
  what: string
  /** Where to get it. */
  where: string
  /** How to compute. */
  how: string
  unit: string
  /** The sheet's worked value at block 25749504 (13 August 2026). */
  example: string
  /** Used on cards: card numbers, "header" or "table". */
  cards: string[]
}

export const SPEC_SOURCE = "Wildcat analytics cheat sheet v4.2"

const ENTRIES: Pick<SpecMetric, "id" | "example" | "cards">[] = [
  {
    id: "M01",
    example: "wmtUSDC (Wintermute Trading USD Coin)",
    cards: ["header"],
  },
  { id: "M02", example: "USDC", cards: ["header"] },
  { id: "M03", example: "2025-03-06", cards: ["header", "2.1"] },
  { id: "M05", example: "525", cards: ["2.1", "3.1", "header"] },
  { id: "M06", example: "130,000,000", cards: ["2.6"] },
  { id: "M07", example: "75,913,003", cards: ["2.6", "table"] },
  { id: "M08", example: "1,565,141", cards: ["2.3"] },
  { id: "M11", example: "8.50%", cards: ["2.5", "table"] },
  { id: "M12", example: "+5.00", cards: ["2.10"] },
  { id: "M13", example: "5.0%", cards: ["2.5"] },
  { id: "M14", example: "0%", cards: ["2.10"] },
  { id: "M15", example: "48 h", cards: ["2.2", "2.10", "2.4"] },
  { id: "M16", example: "24 h", cards: ["2.10"] },
  { id: "M18", example: "82.6", cards: ["2.1", "3.1", "table"] },
  { id: "M20", example: "237", cards: ["2.1", "2.8"] },
  { id: "M21", example: "0", cards: ["2.4", "3.4", "table"] },
  { id: "M22", example: "9 h", cards: ["2.8"] },
  { id: "M23", example: "54.6 h", cards: ["2.2"] },
  { id: "M24", example: "113.7%", cards: ["2.2"] },
  {
    id: "M25",
    example: "5 (sheet value; recount under the span definition, open item B2)",
    cards: ["2.2", "3.8"],
  },
  { id: "M26", example: "0.34%", cards: ["2.1", "3.1", "3.12"] },
  { id: "M27", example: "11,703", cards: ["2.5"] },
  { id: "M30", example: "323", cards: ["2.3", "table"] },
  { id: "M31", example: "268", cards: ["2.3"] },
  { id: "M32", example: "83.0", cards: ["2.3", "3.1", "table"] },
  { id: "M33", example: "83.0", cards: ["2.3"] },
  { id: "M37", example: "0", cards: ["2.3", "2.4"] },
  { id: "M38", example: "1,519,472", cards: ["2.3"] },
  { id: "M39", example: "10.04%", cards: ["2.5"] },
  { id: "M40", example: "10.33%", cards: ["2.5"] },
  { id: "M41", example: "8,500,026", cards: ["2.5"] },
  { id: "M42", example: "0.14%", cards: ["2.5"] },
  { id: "M44", example: "8", cards: ["2.5"] },
  { id: "M48", example: "251", cards: ["2.9"] },
  { id: "M49", example: "591", cards: ["2.9"] },
  { id: "M51", example: "42.5%", cards: ["2.9"] },
  { id: "M56", example: "299,275,673", cards: ["2.3"] },
  { id: "M57", example: "233,852,485", cards: ["2.3"] },
  { id: "M58", example: "65,423,188 (event basis)", cards: ["2.3"] },
  { id: "M59", example: "223", cards: ["2.6"] },
  { id: "M60", example: "206", cards: ["2.6"] },
  { id: "M67", example: "77.8", cards: ["2.1"] },
  { id: "M68", example: "-4.8", cards: ["2.1"] },
  { id: "M69", example: "119", cards: ["2.8"] },
  { id: "M70", example: "103", cards: ["2.8"] },
  { id: "M71", example: "13", cards: ["2.8"] },
  { id: "M72", example: "2", cards: ["2.8"] },
  { id: "M77", example: "Open", cards: ["header", "2.10"] },
  { id: "M80", example: "0.3 h", cards: ["2.1"] },
  { id: "M82", example: "0.3 h", cards: ["2.4"] },
  { id: "M83", example: "97.9%", cards: ["2.2"] },
  { id: "M84", example: "0.5", cards: ["2.4"] },
  { id: "M85", example: "0", cards: ["2.4", "3.4", "table"] },
  {
    id: "M86",
    example:
      "57.2% (totalSupply basis; the sheet showed 58.4% on the totalDebts basis)",
    cards: ["2.6"],
  },
  { id: "S01", example: "5", cards: ["3.8", "header"] },
  { id: "S02", example: "6 Mar 2025", cards: ["header"] },
  { id: "S05", example: "92.1", cards: ["3.1"] },
  { id: "S06", example: "82.6", cards: ["3.1", "header"] },
  { id: "S07", example: "98.8", cards: ["3.1", "header"] },
  { id: "S12", example: "450 (1 still open, in wmtUSDT)", cards: ["3.8"] },
  { id: "S13", example: "6 (1.2 per market, 1.3 per 100)", cards: ["3.8"] },
  { id: "S14", example: "628", cards: ["3.1"] },
  { id: "S15", example: "547", cards: ["3.1"] },
  { id: "S16", example: "87.1", cards: ["3.1"] },
  { id: "S17", example: "83.0 of 323 (wmtUSDC)", cards: ["3.1"] },
  { id: "S18", example: "1", cards: ["3.4"] },
  { id: "S27", example: "89.8", cards: ["3.1"] },
  { id: "S28", example: "-2.3", cards: ["3.1"] },
  { id: "S30", example: '0 ("none completed yet")', cards: ["3.6"] },
  { id: "S31", example: "0", cards: ["3.6"] },
  { id: "S32", example: "0%", cards: ["3.6"] },
  { id: "S33", example: "0 of 0", cards: ["3.6"] },
  { id: "S34", example: "0", cards: ["3.6"] },
  { id: "S35", example: "45,827,898", cards: ["3.4"] },
  { id: "S36", example: "0", cards: ["3.4"] },
  { id: "S37", example: "797", cards: ["3.10"] },
  {
    id: "D03",
    example: "read per market from its hooks instance",
    cards: ["2.10"],
  },
  { id: "D05", example: "no countdown (not late)", cards: ["2.4"] },
  {
    id: "D06",
    example: "next cycle starts with the next withdrawal request",
    cards: ["2.10"],
  },
  {
    id: "D10",
    example:
      "9.9% largest (sheet value from lifetime deposits; recompute from balances)",
    cards: ["2.9"],
  },
  { id: "D11", example: "No defaults on record", cards: ["header"] },
  { id: "D15", example: "54.6 h (against 48 h)", cards: ["3.8"] },
  { id: "D16", example: "9.5 h", cards: ["3.8"] },
  { id: "D17", example: "91.4", cards: ["3.12"] },
  {
    id: "D18",
    example: "55 uncovered: [late] / [never], to be computed",
    cards: ["2.3", "3.1"],
  },
  { id: "D21", example: "99.9", cards: ["3.1"] },
  { id: "H01", example: "45,380,616 s = 525.2 days", cards: ["2.1"] },
  { id: "H02", example: "7,896,216 s = 91.4 days", cards: ["2.1", "3.12"] },
  {
    id: "H08",
    example: "0 s (wmtUSDC was not short at block N)",
    cards: ["2.1", "3.12"],
  },
  { id: "H09", example: "0 s", cards: ["2.1"] },
  {
    id: "G4",
    example: "Open term, allowlist, transfers restricted, MLA signed",
    cards: ["header", "2.10"],
  },
]

export const SPEC_METRICS: SpecMetric[] = ENTRIES.map((entry) => ({
  ...entry,
  ...metricDefinition(entry.id),
}))
