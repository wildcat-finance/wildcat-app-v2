import { Comparison, MetricValues } from "./api"
import { count, isNumber } from "./format"
import { Verdict } from "./tokens"

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

// Evidence gates (education package §1): STRONG needs 90+ days of record,
// 10+ deadlines (exits) or 10+ incidents (worst case). Graded verdicts wait
// for the spec's thresholds; until then the only verdict shown is LIMITED, a
// perfect figure on thin history ("clean so far, barely tested").
export const GATES = { days: 90, deadlines: 10, incidents: 10 } as const
export const LIMITED_NOTE = "clean so far, barely tested"

export const limitedVerdict = (
  thinEvidence: boolean,
  perfect: boolean,
): Verdict | undefined => (thinEvidence && perfect ? "LIMITED" : undefined)

export const withNote = (text: string | undefined, verdict?: Verdict) =>
  verdict === "LIMITED"
    ? [text, LIMITED_NOTE].filter(Boolean).join(" · ")
    : text

/** "better than 9 of 66 graded markets", or how to earn a rank. */
export const rankPhrase = (
  comparison: Comparison | undefined,
  noun: string,
  recordDays?: number,
) => {
  if (!comparison) return `Not enough graded ${noun} to compare yet.`
  if (comparison.betterThan === undefined) {
    return `Ranked once it has ${GATES.days} days of record${
      recordDays === undefined ? "" : `; it has ${count(recordDays)}`
    }.`
  }
  return `Better than ${count(comparison.betterThan)} of ${count(
    comparison.population,
  )} graded ${noun}${
    recordDays === undefined ? "" : `, over ${count(recordDays)} days of record`
  }.`
}

export const ordinal = (value: number) => {
  const suffix =
    value % 100 >= 11 && value % 100 <= 13
      ? "th"
      : { 1: "st", 2: "nd", 3: "rd" }[value % 10] ?? "th"
  return `${value}${suffix}`
}
