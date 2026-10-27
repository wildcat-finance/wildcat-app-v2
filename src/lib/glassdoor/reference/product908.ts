// Reference values for the Glass Door analytics data layer, copied from the
// product#908 checklist (worked values from cheat sheet v4). Every value is
// for the V2 wmtUSDC market or its borrower at one snapshot block.

export const GLASS_DOOR_REFERENCE_CHAIN_ID = 1 as const
export const GLASS_DOOR_REFERENCE_BLOCK = 25_749_504
export const GLASS_DOOR_REFERENCE_MARKET =
  "0xc9499006a149c553d18171747ed19aa7c6dd19e2"
export const GLASS_DOOR_REFERENCE_BORROWER =
  "0x5b15f94efc3a6e2c82d7db8efd8d5ba55da11feb"

export type ReferenceScope = "market" | "borrower"

export type ReferenceValue = {
  id: string
  name: string
  scope: ReferenceScope
  /** The value exactly as product#908 (or cheat sheet v4 for helpers) prints it. */
  reference: string
}

const market = (
  id: string,
  name: string,
  reference: string,
): ReferenceValue => ({
  id,
  name,
  scope: "market",
  reference,
})
const borrower = (
  id: string,
  name: string,
  reference: string,
): ReferenceValue => ({ id, name, scope: "borrower", reference })

export const PRODUCT_908_REFERENCE: ReferenceValue[] = [
  // Shared helpers (product#908 gives formulas; values from cheat sheet v4)
  market("H01", "Recorded life (seconds)", "45,380,616"),
  market("H02", "Delinquent seconds", "7,896,216"),
  market("H08", "Silent tail (seconds)", "1,152"),
  market("H09", "Tail penalised flag", "0"),
  // Market header
  market("M01", "Market name", "wmtUSDC"),
  market("M02", "Underlying asset", "USDC"),
  market("M77", "Lifecycle status", "Open"),
  market("M03", "Deployed (UTC)", "2025-03-06"),
  market(
    "G4",
    "Market type labels",
    "Open term, allowlist, transfers restricted, MLA signed",
  ),
  market("M86", "Capacity used", "57.2%"),
  market("M59", "Borrow transactions", "223"),
  market("M60", "Repay transactions", "206"),
  // 2.1 In order
  market("M18", "In order, cash there", "82.6"),
  // Exact seconds, per Andreas (product#908, 20 Oct 2026); the sheet had 0.34%.
  market("M26", "Time under penalty", "0.20%"),
  market("M05", "Market age", "525"),
  market("M67", "In order, trailing 90 days", "77.8"),
  market("M68", "Trend", "-4.8"),
  market("M20", "Delinquency episodes", "237"),
  // Hours display rounded up to one decimal (product#908, 20 Oct 2026).
  market("M80", "Unrecorded tail (hours)", "0.4"),
  // 2.2 Worst incident
  market("M24", "Worst incident, share of allowance", "113.7%"),
  market("M23", "Longest episode", "54.6"),
  market("M15", "Grace period (allowed lateness)", "48"),
  market("M25", "Grace breaches", "5"),
  market("M83", "Cured within grace", "97.9%"),
  // 2.3 Exits paid on time
  market("M32", "Exits paid on time", "83.0"),
  market("M31", "Batches fully funded at expiry", "268"),
  market("M30", "Batches expired", "323"),
  market("M33", "Exits paid on time, by money", "83.0"),
  market(
    "D18",
    "Uncovered deadlines: paid late / never paid",
    "55 uncovered: [late] / [never], to be computed",
  ),
  market("M37", "Open unpaid batches now", "0"),
  market("M38", "Unclaimed withdrawals", "1,519,472"),
  market("M58", "Out with the borrower", "65,423,188"),
  market("M56", "Lifetime borrowed", "299,275,673"),
  market("M57", "Lifetime repaid", "233,852,485"),
  market("M08", "Assets held by the market", "1,565,141"),
  // 2.4 Right now
  market("M21", "Late within grace now", "0"),
  market("M85", "Past grace now", "0"),
  market("D05", "Grace countdown", "no countdown (not late)"),
  market("M84", "Days since last episode cured", "0.5"),
  market("M82", "Hours since last activity", "0.4"),
  // 2.5 What it pays
  market("M11", "Base APR now", "8.50%"),
  market("M13", "Protocol fee share", "5.0%"),
  market("M39", "Realised lender APR", "10.04%"),
  market("M42", "Penalty share of lender interest", "0.14%"),
  market("M27", "Penalty interest paid", "11,703"),
  market("M41", "Lifetime lender interest", "8,500,026"),
  market("M40", "Time-weighted base APR", "10.33%"),
  market("M44", "APR changes", "8"),
  // 2.6 How the line is used
  market("M06", "Capacity now", "130,000,000"),
  market("M07", "Total owed to lenders now", "75,913,003"),
  // 2.8 Incident history
  market("M69", "Episodes under 6 hours", "119"),
  market("M70", "Episodes 6 to 24 hours", "103"),
  market("M71", "Episodes 24 to 48 hours", "13"),
  market("M72", "Episodes over 48 hours", "2"),
  market("M22", "Mean episode duration", "9.3"),
  // 2.9 Who funds it
  market("M48", "Active lenders now", "251"),
  market("M49", "Distinct lenders, lifetime", "591"),
  market("M51", "Lender retention", "42.5%"),
  market("D10", "Current lender concentration", "9.9%"),
  // 2.10 Terms
  market("M16", "Withdrawal cycle (payout window)", "24"),
  market(
    "D06",
    "Cycle status",
    "next cycle starts with the next withdrawal request",
  ),
  market("M12", "Penalty APR", "+5.00"),
  market("M14", "Reserve ratio", "0%"),
  market("D03", "Minimum deposit", "TBD: read per market"),
  // Borrower header
  borrower("D11", "Defaults on record", "No defaults on record"),
  borrower("S01", "Markets on Wildcat", "5"),
  borrower("S02", "First market deployed", "2025-03-06"),
  borrower("S06", "Worst market", "82.6"),
  borrower("S07", "Best market", "98.8"),
  // 3.1 In order, all markets
  borrower("S05", "In order, all markets", "92.1"),
  borrower("D21", "Contract kept, all markets", "99.9"),
  borrower("S27", "In order, all markets, trailing 90 days", "89.8"),
  borrower("S28", "Trend, all markets", "-2.3"),
  borrower("S14", "Batches expired, all markets", "628"),
  borrower("S15", "Batches funded at expiry, all markets", "547"),
  borrower("S16", "Exits paid on time, all markets", "87.1"),
  borrower("S17", "Weakest market on exits", "83.0"),
  // 3.4 Right now, all markets
  borrower("S18", "Markets late now", "1"),
  borrower("S35", "Debt late within grace now", "45,827,898"),
  borrower("S36", "Debt past grace now", "0"),
  // 3.6 Completed credit cycle
  borrower("S31", "Capital through completed facilities", "0"),
  borrower("S30", "Completed facilities", "0"),
  borrower("S32", "Share of record from completed facilities", "0%"),
  // The card shows "S33 of S30"; the sheet's "0 of 0".
  borrower("S33", "Completions verified", "0"),
  borrower("S34", "Clean closures", "0"),
  // 3.8 Discipline
  borrower("S12", "Episodes, all markets", "450"),
  borrower("D16", "Typical cure time, all markets", "9.6"),
  borrower("S13", "Grace breaches, all markets", "6"),
  borrower("D15", "Longest episode, all markets", "2.3"),
  // 3.10 Lender breadth
  // Token holders, as M49, per Andreas (product#908, 20 Oct 2026); was 753.
  borrower("S37", "Distinct lenders, all markets", "797"),
  // 3.12 Trouble over time
  // Per market (H02 / 86,400), shown per market on borrower card 3.12.
  market("D17", "Late time per market", "91.4"),
]

/**
 * Reference values that product#908 marks as provisional, or that the
 * fixtures show were computed differently from the cheat sheet v4 definition.
 * A metric that computes a different value here is reported, not failed.
 */
export const ACCEPTED_REFERENCE_DIFFERENCES: Record<string, string> = {
  M25: "Sheet value; recount under the penalty-span definition (open item B2).",
  M83: "Follows the B2 breach recount.",
  S13: "Follows the B2 breach recount.",
  D10: "Sheet value from lifetime deposits; v4 recomputes from current balances.",
  D18: "Reference has only the total (55 uncovered); the test checks that the split adds up to it.",
  D03: "Read from the hooks instance at publication time, not from a dataset; no reference value (TBD).",
  H01: "Reference leaves the silent tail out of recorded life; v4 counts it (H08, 1,152 s), as late only when cash was short.",
  D21: "Exact seconds (as M26) give 99.952, which prints as 100.0 at v4's one decimal; display to confirm.",
  M67: "Reference window is the 90 full UTC days before the snapshot's day plus that day (77.830); v4 and Glass Door use exactly 90 days back (77.585).",
  M68: "Follows M67 (77.6 - 82.6).",
  S27: "Uses the M67 window (exactly 90 days back); not separately reconciled with the reference.",
  S28: "Follows S27 and S05.",
}
