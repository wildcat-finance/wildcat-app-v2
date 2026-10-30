import { Comparison, MetricValues } from "./api"
import { BLANK, count, hours, isNumber, longDate } from "./format"
import { GATES } from "./rules"

/** Typed reads of published metric values. */
export const reader = (values: MetricValues) => ({
  n: (id: string) => {
    const value = values[id]
    return isNumber(value) ? value : undefined
  },
  s: (id: string) => {
    const value = values[id]
    return typeof value === "string" && value !== "" ? value : undefined
  },
})

/** The leading number of a published phrase such as "6.61 h past grace". */
export const leadingNumber = (text?: string) => {
  const match = text?.match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : undefined
}

/** "better than 9 of 66 graded markets", or how to earn a rank. */
export const rankPhrase = (
  comparison: Comparison | undefined,
  noun: string,
  recordDays?: number,
) => {
  if (!comparison) return `TBD: not enough graded ${noun} to compare yet`
  if (comparison.betterThan === undefined) {
    return `ranked once it has ${GATES.gradeDays} days of record${
      recordDays === undefined ? "" : `; it has ${count(recordDays)}`
    }`
  }
  return `better than ${count(comparison.betterThan)} of ${count(
    comparison.population,
  )} graded ${noun}`
}

export const ordinal = (value: number) => {
  const suffix =
    value % 100 >= 11 && value % 100 <= 13
      ? "th"
      : { 1: "st", 2: "nd", 3: "rd" }[value % 10] ?? "th"
  return `${value}${suffix}`
}

export const yesNo = (value?: number) => {
  if (value === 1) return "yes"
  if (value === 0) return "no"
  return BLANK.unavailable
}

/** Lifecycle status (M77): a closed market is shown as finished. */
export const lifecycle = (status?: string) =>
  status === "Closed" ? "Finished" : status ?? BLANK.unavailable

/** Cycle status (D06) is published with exact hours; show one decimal. */
export const cycleStatus = (status?: string) =>
  status?.replace(/(\d+\.\d+) h/, (_, value: string) => hours(Number(value))) ??
  BLANK.unavailable

/** An ISO day such as Deployed (UTC) (M03), as a UTC date. */
export const isoDay = (day?: string) =>
  day && Number.isFinite(Date.parse(day))
    ? longDate(Date.parse(day) / 1_000)
    : BLANK.unavailable

/** Spec lists: "a; b; c." with missing parts left out. */
export const sentence = (...parts: (string | false | undefined)[]) => {
  const text = parts.filter(Boolean).join("; ")
  return text ? `${text}.` : ""
}

/**
 * A market that never had a lender (M49 = 0) took no deposits: not funded.
 * Only a published zero excludes a market; missing values stay unknown.
 */
export const isFunded = (values: MetricValues) => {
  const { n } = reader(values)
  const ever = n("M49")
  if (ever !== undefined) return ever > 0
  return n("H01") !== 0
}

/**
 * Episodes still open at the snapshot. Delinquency episodes (M20) is published
 * as finished episodes, while the spec counts an open one too: a market short
 * now within grace (M21) has one, and so does lateness on record (M23) with no
 * finished episode. Past grace alone (M85) can be a residual penalty clock.
 */
export const openEpisodes = (values: MetricValues) => {
  const { n } = reader(values)
  if (n("M21") === 1) return 1
  return (n("M20") ?? 0) === 0 && (n("M23") ?? 0) > 0 ? 1 : 0
}
