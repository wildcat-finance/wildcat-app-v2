import { roundedHours } from "@/lib/glassdoor/format"

import { MetricValue, Series } from "./api"
import { text, Under } from "./text"

// Number rules from the design language: scores and percentages to one
// decimal on cards and two inside formulas, rounded half up; token amounts in
// up to six decimals with separators; signed trends keep their sign; hours round up
// (roundedHours). Blanks are words, never 0, 100 or a dash. The words and the
// units come from glassDoor.json; this file only rounds and groups numbers.

/** The words shown in place of a value that does not exist. */
export const BLANK = {
  neverLate: text("shared.blank.neverLate"),
  noExits: text("shared.blank.noExits"),
  noIncidents: text("shared.blank.noIncidents"),
  noneCompleted: text("shared.blank.noneCompleted"),
  noYield: text("shared.blank.noYield"),
  unavailable: text("shared.blank.unavailable"),
  splitSoon: text("shared.blank.splitSoon"),
  countSoon: text("shared.blank.countSoon"),
  noRecord: text("shared.blank.noRecord"),
  noHistory: text("shared.blank.noHistory"),
  noBook: text("shared.blank.noBook"),
  noMedianMarket: text("shared.blank.noMedianMarket"),
  noMedianBorrower: text("shared.blank.noMedianBorrower"),
  noProtocolCounts: text("shared.blank.noProtocolCounts"),
  noFinishedEpisode: text("shared.blank.noFinishedEpisode"),
  notFunded: text("shared.blank.notFunded"),
  noFundedMarket: text("shared.blank.noFundedMarket"),
} as const

const MINUS = "−"

export const isNumber = (value: MetricValue | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

/** A published series: [unix seconds, value] points, oldest first. */
export const isSeries = (value: unknown): value is Series =>
  Array.isArray(value) &&
  value.every(
    (point) =>
      Array.isArray(point) &&
      point.length === 2 &&
      typeof point[0] === "number" &&
      typeof point[1] === "number",
  )

const roundHalfUp = (value: number, decimals: number) => {
  const scale = 10 ** decimals
  return (Math.sign(value) * Math.round(Math.abs(value) * scale)) / scale
}

const grouped = (value: number, decimals: number) =>
  Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

const signed = (value: number, shown: string) =>
  value < 0 ? `${MINUS}${shown}` : shown

/** A number that is already rounded, with the percent sign. */
export const percentOf = (value: string) =>
  text("shared.units.percent", { value })

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
  const shown = grouped(rounded, decimals).replace(/\.0+$/, "")
  return percentOf(signed(rounded, shown))
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
  percentOf(grouped(roundHalfUp(value, 2), 2))

/** An APR always keeps two decimals, so a column reads "8.50%" and "50.00%". */
export const apr = lifeShare

/** A signed trend: "+1.2", "−4.8". */
export const trend = (value: number) => {
  const rounded = roundHalfUp(value, 1)
  const shown = grouped(rounded, 1)
  if (rounded > 0) return `+${shown}`
  return signed(rounded, shown)
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

/** An amount with its token: "1,234 USDC"; the bare amount without one. */
export const withAsset = (value: string, asset?: string) =>
  asset ? text("shared.units.amount", { value, asset }) : value

/** Short amounts for tables: "75.9M", "45.7K". */
export const compactUnits = (value: number) => {
  const abs = Math.abs(value)
  const short = (scale: number, unit: "billions" | "millions" | "thousands") =>
    signed(
      value,
      text(`shared.units.${unit}`, {
        value: grouped(roundHalfUp(abs / scale, 1), 1),
      }),
    )
  if (abs >= 1e9) return short(1e9, "billions")
  if (abs >= 1e6) return short(1e6, "millions")
  if (abs >= 1e4) return short(1e3, "thousands")
  if (abs >= 100) return units(value)
  if (abs > 0 && abs < 0.01) return value > 0 ? "<0.01" : ">−0.01"
  return signed(
    value,
    abs.toLocaleString("en-US", { maximumFractionDigits: 2 }),
  )
}

/** Hours as a bare number, rounded up: "54.6". */
export const hoursNumber = (valueInHours: number, decimals = 1) =>
  roundedHours(valueInHours * 3_600, decimals)

/** Hours with their unit: "54.6 h". */
export const hours = (valueInHours: number, decimals = 1) =>
  text("shared.units.hours", { value: hoursNumber(valueInHours, decimals) })

/** A number that is already rounded, with the day unit. */
export const daysOf = (value: string) => text("shared.units.days", { value })

/** Days to one decimal: "0.5 d", "91.4 d". */
export const days = (value: number) => daysOf(grouped(roundHalfUp(value, 1), 1))

/** An age in days as the design prints it: "0.5 d" under a day, else whole days. */
export const ageDays = (value: number) =>
  value < 1 ? days(value) : daysOf(grouped(Math.round(value), 0))

export const block = (value: number) => grouped(value, 0)

export const longDate = (timestamp: number) =>
  new Date(timestamp * 1_000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })

export type Noun = Under<"shared.nouns">

/** A count with its noun, from the file's plural forms: "1 incident", "528 incidents". */
export const counted = (noun: Noun, value: number) =>
  text(`shared.nouns.${noun}`, { count: Math.round(value), n: count(value) })

/** "24 h" when both ends agree, else "24 h to 72 h". */
export const range = (low: string, high: string) =>
  low === high ? low : text("shared.range", { low, high })
