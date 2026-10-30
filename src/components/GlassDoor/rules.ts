// Verdict and state rules from the design handoff (product#908,
// analytics-card.js part 1), ported as written. Inputs are published metric
// values; a missing input gives no verdict, never a guessed one.

export type Verdict = "STRONG" | "WATCH" | "PROBLEM" | "LIMITED"
export type Tone = "green" | "amber" | "red" | "neutral"

export const LIMITED_NOTE = "clean so far, barely tested"
export const GATES = { gradeDays: 90, exitDeadlines: 10, penaltyShareAmber: 5 }

/** Card 2.1 (market) and 3.1 (borrower). days = Market age (M05), or Σ M05 for a book. */
export function verdictInOrder({
  score,
  trend = 0,
  days,
  stale = false,
}: {
  score?: number
  trend?: number
  days?: number
  stale?: boolean
}): Verdict | null {
  if (score === undefined) return null
  if (score < 70) return "PROBLEM"
  if (score < 85 || trend < -10 || stale) return "WATCH"
  if (days === undefined) return null
  return days >= GATES.gradeDays ? "STRONG" : "LIMITED"
}

/** Card 2.2. pct = Worst incident, share of allowance (M24). */
export function verdictWorstIncident(pct?: number): Verdict | null {
  if (pct === undefined) return null
  if (pct > 100) return "PROBLEM"
  if (pct >= 60) return "WATCH"
  return "STRONG"
}

/** Card 2.3 and the exits line of 3.1. pct = M32 (or S16), deadlines = M30 (or S14). */
export function verdictExits({
  pct,
  deadlines,
}: {
  pct?: number
  deadlines?: number
}): Verdict | null {
  if (!deadlines || pct === undefined) return null
  if (pct < 70) return "PROBLEM"
  if (pct < 95) return "WATCH"
  return deadlines >= GATES.exitDeadlines ? "STRONG" : "LIMITED"
}

/** Card 2.5: neutral, with an amber chip only when penalty share (M42) exceeds 5%. */
export const penaltyChip = (penaltySharePct?: number) =>
  penaltySharePct !== undefined && penaltySharePct > GATES.penaltyShareAmber
    ? "yield partly from penalties"
    : null
