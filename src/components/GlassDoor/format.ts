import { formatHours } from "@/lib/glassdoor/format"

import { MetricValue } from "./api"

// Number rules from the design language: scores and percentages to one
// decimal on cards and two inside formulas, rounded half up; token amounts in
// up to six decimals with separators; signed trends keep their sign; hours round up
// (formatHours). Blanks are words, never 0, 100 or a dash.

export const BLANK = {
  neverLate: "never late",
  noExits: "no exit history yet",
  noIncidents: "no incidents yet",
  noneCompleted: "none completed yet",
  noYield: "no yield history yet",
  unavailable: "not available",
  splitSoon: "split not available",
  countSoon: "count not available",
} as const

const MINUS = "−"

export const isNumber = (value: MetricValue | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

const roundHalfUp = (value: number, decimals: number) => {
  const scale = 10 ** decimals
  return (Math.sign(value) * Math.round(Math.abs(value) * scale)) / scale
}

const grouped = (value: number, decimals: number) =>
  Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

const signed = (value: number, text: string) =>
  value < 0 ? `${MINUS}${text}` : text

/** A 0-100 score: always one decimal ("82.6", "100.0"). */
export const score = (value: number, decimals = 1) => {
  const rounded = roundHalfUp(value, decimals)
  return signed(rounded, grouped(rounded, decimals))
}

/** Missing published evidence is never a zero or a perfect score. */
export const display = (
  value: number | undefined,
  format: (number: number) => string = score,
  empty: string = BLANK.unavailable,
) => (value === undefined ? empty : format(value))

/** A percentage: one decimal without a trailing ".0" ("83%", "113.7%"). */
export const percent = (value: number, decimals = 1) => {
  const rounded = roundHalfUp(value, decimals)
  const text = grouped(rounded, decimals).replace(/\.0+$/, "")
  return `${signed(rounded, text)}%`
}

/** A share of life, which prints two decimals ("0.34%"). */
export const lifeShare = (value: number) =>
  `${grouped(roundHalfUp(value, 2), 2)}%`

/** A signed trend: "+1.2", "−4.8". */
export const trend = (value: number) => {
  const rounded = roundHalfUp(value, 1)
  const text = grouped(rounded, 1)
  if (rounded > 0) return `+${text}`
  return signed(rounded, text)
}

/** Exact counts with separators. */
export const count = (value: number) => grouped(Math.round(value), 0)

/** Preserve subunit amounts; a positive token balance must never read as zero. */
export const tokens = (value: number) => {
  if (value !== 0 && Math.abs(value) < 0.000001) {
    return value > 0 ? "<0.000001" : ">−0.000001"
  }
  return signed(
    value,
    Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 6 }),
  )
}

export const hours = (valueInHours: number, decimals = 1) =>
  formatHours(valueInHours * 3_600, decimals)

/** Days to one decimal: "0.5 d", "91.4 d". */
export const days = (value: number) => `${grouped(roundHalfUp(value, 1), 1)} d`

export const block = (value: number) => grouped(value, 0)

export const longDate = (timestamp: number) =>
  new Date(timestamp * 1_000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })

/** A denominator phrase that keeps its count: "of 323 payout deadlines". */
export const of = (total: number, noun: string, plural = `${noun}s`) =>
  `of ${count(total)} ${total === 1 ? noun : plural}`
