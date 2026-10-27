import { MetricResults } from "../datasetMetrics"

// Comparisons with the protocol, computed once per publication and stored on
// each row, so a page reads its market or borrower and its comparisons in one
// request. A median is taken over graded members only: V2 markets (or
// borrowers' books) with at least 90 days of record. A rank says how many of
// that population this one is better than, and only where better has a
// direction.

export const GRADED_DAYS = 90

type Direction = "higher" | "lower" | null

/** Compared market records; the direction in which a value is better. */
export const MARKET_COMPARISONS: Record<string, Direction> = {
  M18: "higher",
  M26: "lower",
  M24: "lower",
  M32: "higher",
  M33: "higher",
  M22: "lower",
  M39: null,
  M20: null,
  M49: null,
}

/**
 * Compared point-in-time market metrics. A closed market's read zero, so
 * these compare open markets only, and a closed market gets none.
 */
export const OPEN_MARKET_COMPARISONS: Record<string, Direction> = {
  M11: null,
  M86: null,
  M51: null,
  D10: null,
}

export const BORROWER_COMPARISONS: Record<string, Direction> = {
  S05: "higher",
  D21: "higher",
  S16: "higher",
  D16: "lower",
  S01: null,
  S12: null,
  S37: null,
  MARKET_DAYS: null,
}

export type Comparison = {
  median: number
  /** Graded members with a value for this metric. */
  population: number
  /** How many of them this one is better than, when it is graded itself. */
  betterThan?: number
}

export type ProtocolCounts = {
  /** Every published market, graded or not. */
  markets: number
  openMarkets: number
  /** Open markets late within grace or past it right now. */
  lateNow: number
  gradedMarkets: number
  borrowers: number
  gradedBorrowers: number
  /** Completed facilities (S30) summed over every borrower. */
  completedFacilities: number
}

const numeric = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

export function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

export const isGradedMarket = (metrics: MetricResults) =>
  Number(metrics.M05) >= GRADED_DAYS

const isOpen = (metrics: MetricResults) => metrics.M77 === "Open"

export const isGradedBorrower = (metrics: MetricResults) =>
  Number(metrics.MARKET_DAYS) >= GRADED_DAYS

function compare(
  subject: MetricResults,
  population: MetricResults[],
  metrics: Record<string, Direction>,
  subjectGraded: boolean,
) {
  const comparisons: Record<string, Comparison> = {}
  Object.entries(metrics).forEach(([id, direction]) => {
    const values = population.map((member) => member[id]).filter(numeric)
    if (values.length === 0) return
    const comparison: Comparison = {
      median: median(values),
      population: values.length,
    }
    const value = subject[id]
    if (direction && subjectGraded && numeric(value)) {
      comparison.betterThan = values.filter((other) =>
        direction === "higher" ? other < value : other > value,
      ).length
    }
    comparisons[id] = comparison
  })
  return comparisons
}

export function marketComparisons(
  subject: MetricResults,
  markets: MetricResults[],
) {
  const graded = markets.filter(isGradedMarket)
  const subjectGraded = isGradedMarket(subject)
  return {
    ...compare(subject, graded, MARKET_COMPARISONS, subjectGraded),
    ...(isOpen(subject)
      ? compare(
          subject,
          graded.filter(isOpen),
          OPEN_MARKET_COMPARISONS,
          subjectGraded,
        )
      : {}),
  }
}

export const borrowerComparisons = (
  subject: MetricResults,
  borrowers: MetricResults[],
) =>
  compare(
    subject,
    borrowers.filter(isGradedBorrower),
    BORROWER_COMPARISONS,
    isGradedBorrower(subject),
  )

export function protocolCounts(
  markets: MetricResults[],
  borrowers: MetricResults[],
): ProtocolCounts {
  const open = markets.filter(isOpen)
  return {
    markets: markets.length,
    openMarkets: open.length,
    lateNow: open.filter(
      (market) => Number(market.M21) === 1 || Number(market.M85) === 1,
    ).length,
    gradedMarkets: markets.filter(isGradedMarket).length,
    borrowers: borrowers.length,
    gradedBorrowers: borrowers.filter(isGradedBorrower).length,
    completedFacilities: borrowers.reduce(
      (total, borrower) => total + Number(borrower.S30 ?? 0),
      0,
    ),
  }
}
