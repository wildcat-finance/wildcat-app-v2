import { Comparison, MetricValue, MetricValues } from "./api"
import { BLANK, count, hours, isNumber, longDate } from "./format"
import { GATES } from "./rules"
import { text } from "./text"

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

/** What a rank is among: the file's word for graded markets or borrowers. */
export type RankNoun = "markets" | "borrowers"

/** "better than 9 of 66 graded markets", or how to earn a rank. */
export const rankPhrase = (
  comparison: Comparison | undefined,
  noun: RankNoun,
  recordDays?: number,
) => {
  const among = text(`shared.rank.${noun}`)
  if (!comparison) return text("shared.rank.notEnough", { noun: among })
  if (comparison.betterThan === undefined) {
    return recordDays === undefined
      ? text("shared.rank.pending", { days: GATES.gradeDays })
      : text("shared.rank.pendingHas", {
          days: GATES.gradeDays,
          has: count(recordDays),
        })
  }
  return text("shared.rank.betterThan", {
    position: count(comparison.betterThan),
    population: count(comparison.population),
    noun: among,
  })
}

/** "1st", "2nd", "23rd", from the file's ordinal forms. */
export const ordinal = (value: number) =>
  text("shared.ordinal", { count: value, ordinal: true })

export const yesNo = (value?: number) => {
  if (value === 1) return text("shared.yesNo.yes")
  if (value === 0) return text("shared.yesNo.no")
  return BLANK.unavailable
}

/** Lifecycle status (M77): a closed market is shown as finished. */
export const lifecycle = (status?: string) => {
  if (status === "Closed") return text("shared.lifecycle.finished")
  if (status === "Open") return text("shared.lifecycle.open")
  return BLANK.unavailable
}

/**
 * Cycle status (D06): the hours until the running payout cycle ends, blank
 * when none is running. The sentence is the file's, never the publication's.
 */
export const cycleStatus = (hoursLeft: MetricValue | undefined) => {
  if (isNumber(hoursLeft))
    return text("shared.cycle.running", { hours: hours(hoursLeft) })
  return hoursLeft === "" ? text("shared.cycle.idle") : BLANK.unavailable
}

/** An ISO day such as Deployed (UTC) (M03), as a UTC date. */
export const isoDay = (day?: string) =>
  day && Number.isFinite(Date.parse(day))
    ? longDate(Date.parse(day) / 1_000)
    : BLANK.unavailable

/** Spec lists: "a; b; c." with missing parts left out. */
export const sentence = (...parts: (string | false | undefined)[]) => {
  const joined = parts.filter(Boolean).join("; ")
  return joined ? `${joined}.` : ""
}

/** Parts on one line, missing ones left out: "a · b · c". */
export const join = (...parts: (string | false | undefined)[]) =>
  parts.filter(Boolean).join(" · ")

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
