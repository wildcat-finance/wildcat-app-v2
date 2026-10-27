import { MetricResults } from "../datasetMetrics"
import { ScanFilter, uncoveredIntervals } from "../sources/chainScan"

// Publish gates: checks on a staged publication before it goes live. A market
// or borrower that fails its own checks is published under review with its
// values withheld. A market missing from the run, or blocks it needs that were
// never scanned, hold the whole publication, so the previous one stays live.

type Rule = { min?: number; max?: number; integer?: boolean }

const COUNT: Rule = { min: 0, integer: true }
const AMOUNT: Rule = { min: 0 }
const PERCENT: Rule = { min: 0, max: 100 }
const TREND: Rule = { min: -100, max: 100 }
const FLAG: Rule = { min: 0, max: 1, integer: true }
const EPSILON = 1e-9
const HOUR = 3_600
const DAY = 86_400

/** Bounds per metric; ids without a rule (names, labels, signed values) pass. */
export const MARKET_RULES: Record<string, Rule> = {
  H01: COUNT,
  H02: COUNT,
  H08: COUNT,
  H09: FLAG,
  M05: AMOUNT,
  M06: AMOUNT,
  M07: AMOUNT,
  M08: AMOUNT,
  M11: AMOUNT,
  M12: AMOUNT,
  M13: PERCENT,
  M14: PERCENT,
  M15: AMOUNT,
  M16: AMOUNT,
  M18: PERCENT,
  M20: COUNT,
  M21: FLAG,
  M22: AMOUNT,
  M23: AMOUNT,
  // Worst incident against the allowance can exceed 100%.
  M24: AMOUNT,
  M26: PERCENT,
  M27: AMOUNT,
  M30: COUNT,
  M31: COUNT,
  M32: PERCENT,
  M33: AMOUNT,
  M37: COUNT,
  M38: AMOUNT,
  M39: AMOUNT,
  M40: AMOUNT,
  M41: AMOUNT,
  M42: PERCENT,
  M44: COUNT,
  M48: COUNT,
  M49: COUNT,
  M51: PERCENT,
  M56: AMOUNT,
  M57: AMOUNT,
  M59: COUNT,
  M60: COUNT,
  M67: PERCENT,
  M68: TREND,
  M69: COUNT,
  M70: COUNT,
  M71: COUNT,
  M72: COUNT,
  M80: AMOUNT,
  M82: AMOUNT,
  M84: AMOUNT,
  M85: FLAG,
  // Capacity used can exceed 100%.
  M86: AMOUNT,
  D03: AMOUNT,
  D10: PERCENT,
  D17: AMOUNT,
  D18_LATE: COUNT,
  D18_NEVER: COUNT,
  WINDOW_DAYS: AMOUNT,
}

export const BORROWER_RULES: Record<string, Rule> = {
  S01: COUNT,
  MARKET_DAYS: AMOUNT,
  S05: PERCENT,
  S06: PERCENT,
  S07: PERCENT,
  S12: COUNT,
  S14: COUNT,
  S15: COUNT,
  S16: PERCENT,
  S17: PERCENT,
  S18: COUNT,
  S27: PERCENT,
  S28: TREND,
  S30: COUNT,
  S31: AMOUNT,
  S32: PERCENT,
  S33: COUNT,
  S34: COUNT,
  S35: AMOUNT,
  S36: AMOUNT,
  S37: COUNT,
  D15: AMOUNT,
  D16: AMOUNT,
  D21: PERCENT,
}

/** Lifetime totals that can only grow from one publication to the next. */
export const MARKET_COUNTERS = [
  "M20",
  "M27",
  "M30",
  "M31",
  "M41",
  "M44",
  "M49",
  "M56",
  "M57",
  "M59",
  "M60",
  "M69",
  "M70",
  "M71",
  "M72",
  "D18_LATE",
]
export const BORROWER_COUNTERS = [
  "S01",
  "S12",
  "S14",
  "S15",
  "S30",
  "S31",
  "S33",
  "S34",
  "S37",
]

const asNumber = (value: unknown) =>
  typeof value === "number" ? value : undefined

const MARKET_RELATIONS: [string, (metrics: MetricResults) => boolean][] = [
  ["H02 ≤ H01", (m) => Number(m.H02) <= Number(m.H01)],
  ["H08 ≤ H01", (m) => Number(m.H08) <= Number(m.H01)],
  ["M31 ≤ M30", (m) => Number(m.M31) <= Number(m.M30)],
  // Every batch short at expiry was either paid late or is still unpaid.
  [
    "D18_LATE + D18_NEVER = M30 - M31",
    (m) =>
      m.D18_LATE === "" ||
      m.D18_LATE === undefined ||
      Number(m.D18_LATE) + Number(m.D18_NEVER) ===
        Number(m.M30) - Number(m.M31),
  ],
  [
    "M69 + M70 + M71 + M72 = M20",
    (m) =>
      Number(m.M69) + Number(m.M70) + Number(m.M71) + Number(m.M72) ===
      Number(m.M20),
  ],
  // An open market's durations fit in its life, give or take an hour of
  // timestamps. A closed market's age stops at closure, while later
  // withdrawals can still record accrual time.
  [
    "H01 ≤ M05",
    (m) => m.M77 !== "Open" || Number(m.H01) <= Number(m.M05) * DAY + HOUR,
  ],
  [
    "M23 ≤ M05",
    (m) =>
      m.M77 !== "Open" || Number(m.M23) * HOUR <= Number(m.M05) * DAY + HOUR,
  ],
  [
    "D17 ≤ M05",
    (m) =>
      m.M77 !== "Open" || Number(m.D17) * DAY <= Number(m.M05) * DAY + HOUR,
  ],
]

const BORROWER_RELATIONS: [string, (metrics: MetricResults) => boolean][] = [
  ["S15 ≤ S14", (m) => Number(m.S15) <= Number(m.S14)],
  ["S33 ≤ S30", (m) => Number(m.S33 ?? 0) <= Number(m.S30 ?? 0)],
  ["S34 ≤ S30", (m) => Number(m.S34 ?? 0) <= Number(m.S30 ?? 0)],
  [
    "S06 ≤ S07",
    (m) => m.S06 === "" || m.S07 === "" || Number(m.S06) <= Number(m.S07),
  ],
]

function boundProblems(metrics: MetricResults, rules: Record<string, Rule>) {
  const problems: string[] = []
  Object.entries(rules).forEach(([id, rule]) => {
    const value = metrics[id]
    if (value === undefined || value === "" || typeof value === "string") {
      return
    }
    if (!Number.isFinite(value)) {
      problems.push(`${id} is not a finite number`)
      return
    }
    if (rule.min !== undefined && value < rule.min - EPSILON) {
      problems.push(`${id} = ${value} is below ${rule.min}`)
    }
    if (rule.max !== undefined && value > rule.max + EPSILON) {
      problems.push(`${id} = ${value} is above ${rule.max}`)
    }
    if (rule.integer && !Number.isInteger(value)) {
      problems.push(`${id} = ${value} is not a whole number`)
    }
  })
  return problems
}

function counterProblems(
  metrics: MetricResults,
  previous: Record<string, unknown> | undefined,
  counters: string[],
) {
  if (!previous) return []
  return counters.flatMap((id) => {
    const now = asNumber(metrics[id])
    const before = asNumber(previous[id])
    return now !== undefined && before !== undefined && now < before - EPSILON
      ? [`${id} fell from ${before} to ${now}`]
      : []
  })
}

const relationProblems = (
  metrics: MetricResults,
  relations: [string, (metrics: MetricResults) => boolean][],
) => relations.filter(([, holds]) => !holds(metrics)).map(([name]) => name)

/**
 * Why a market's metrics can't be published. `previous` is its values in the
 * current publication, when that used the same formulas.
 */
export const marketGateProblems = (
  metrics: MetricResults,
  previous?: Record<string, unknown>,
) => [
  ...boundProblems(metrics, MARKET_RULES),
  ...relationProblems(metrics, MARKET_RELATIONS),
  ...counterProblems(metrics, previous, MARKET_COUNTERS),
]

export const borrowerGateProblems = (
  metrics: MetricResults,
  previous?: Record<string, unknown>,
) => [
  ...boundProblems(metrics, BORROWER_RULES),
  ...relationProblems(metrics, BORROWER_RELATIONS),
  ...counterProblems(metrics, previous, BORROWER_COUNTERS),
]

export type CommittedRange = {
  filter: ScanFilter
  fromBlock: number
  toBlock: number
  addresses: string[]
}

/**
 * Blocks a published market depends on that no committed scan range covers:
 * its logs from deployment to the cut, and asset transfers after its dataset
 * (which is how a quiet market is known to have had no activity).
 */
export function coverageGaps(
  ranges: CommittedRange[],
  market: { address: string; deploymentBlock: number; datasetBlock?: number },
  cutBlock: number,
) {
  const covering = (filter: ScanFilter) =>
    ranges.filter(
      (range) =>
        range.filter === filter && range.addresses.includes(market.address),
    )
  const gaps = (filter: ScanFilter, fromBlock: number) =>
    uncoveredIntervals(covering(filter), fromBlock, cutBlock).map(
      (gap) => `${filter} ${gap.fromBlock}-${gap.toBlock}`,
    )
  const transfersFrom =
    market.datasetBlock !== undefined && market.datasetBlock < cutBlock
      ? market.datasetBlock + 1
      : undefined
  return [
    ...gaps("MarketLogs", market.deploymentBlock),
    ...(transfersFrom === undefined
      ? []
      : [
          ...gaps("TransfersIn", transfersFrom),
          ...gaps("TransfersOut", transfersFrom),
        ]),
  ]
}
