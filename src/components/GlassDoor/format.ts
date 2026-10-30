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

// Contract kept reads 100 only when no penalty time was charged (product#908),
// so a value just below 100 keeps the decimals that show it.
const keptDecimals = (value: number) => {
  let decimals = 1
  while (value < 100 && decimals < 4 && roundHalfUp(value, decimals) >= 100)
    decimals += 1
  return decimals
}
export const contractKept = (value: number) => score(value, keptDecimals(value))
export const contractKeptPercent = (value: number) =>
  percent(value, keptDecimals(value))

/** A share of life, which prints two decimals ("0.34%"). */
export const lifeShare = (value: number) =>
  `${grouped(roundHalfUp(value, 2), 2)}%`

/** An APR always keeps two decimals, so a column reads "8.50%" and "50.00%". */
export const apr = lifeShare

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

/** Token amounts in whole units with separators; small balances keep four decimals. */
export const units = (value: number) => {
  const abs = Math.abs(value)
  if (abs >= 100) return signed(value, grouped(Math.round(abs), 0))
  if (abs > 0 && abs < 0.0001) return value > 0 ? "<0.0001" : ">−0.0001"
  return signed(
    value,
    abs.toLocaleString("en-US", { maximumFractionDigits: 4 }),
  )
}

/** Short amounts for tables: "75.9M", "45.7K". */
export const compactUnits = (value: number) => {
  const abs = Math.abs(value)
  const short = (scale: number, suffix: string) =>
    signed(value, `${grouped(roundHalfUp(abs / scale, 1), 1)}${suffix}`)
  if (abs >= 1e9) return short(1e9, "B")
  if (abs >= 1e6) return short(1e6, "M")
  if (abs >= 1e4) return short(1e3, "K")
  if (abs >= 100) return units(value)
  if (abs > 0 && abs < 0.01) return value > 0 ? "<0.01" : ">−0.01"
  return signed(
    value,
    abs.toLocaleString("en-US", { maximumFractionDigits: 2 }),
  )
}

export const hours = (valueInHours: number, decimals = 1) =>
  formatHours(valueInHours * 3_600, decimals)

/** Days to one decimal: "0.5 d", "91.4 d". */
export const days = (value: number) => `${grouped(roundHalfUp(value, 1), 1)} d`

/** An age in days as the design prints it: "0.5 d" under a day, else whole days. */
export const ageDays = (value: number) =>
  value < 1 ? days(value) : `${grouped(Math.round(value), 0)} d`

export const block = (value: number) => grouped(value, 0)

export const longDate = (timestamp: number) =>
  new Date(timestamp * 1_000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })

/** A count with its noun: "1 incident", "528 incidents". */
export const plural = (value: number, noun: string, many = `${noun}s`) =>
  `${count(value)} ${Math.round(value) === 1 ? noun : many}`

/** A denominator phrase that keeps its count: "of 323 payout deadlines". */
export const of = (total: number, noun: string, many = `${noun}s`) =>
  `of ${count(total)} ${total === 1 ? noun : many}`
