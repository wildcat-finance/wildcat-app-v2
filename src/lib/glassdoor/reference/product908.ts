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
  scope: ReferenceScope
  /** The value exactly as product#908 (or cheat sheet v4 for helpers) prints it. */
  reference: string
}

// Each metric's name is in src/locales/en/glassDoor.json (metrics.<id>.name).
const market = (id: string, reference: string): ReferenceValue => ({
  id,
  scope: "market",
  reference,
})
const borrower = (id: string, reference: string): ReferenceValue => ({
  id,
  scope: "borrower",
  reference,
})

export const PRODUCT_908_REFERENCE: ReferenceValue[] = [
  // Shared helpers (product#908 gives formulas; values from cheat sheet v4)
  market("H01", "45,380,616"),
  market("H02", "7,896,216"),
  market("H08", "1,152"),
  market("H09", "0"),
  // Market header
  market("M01", "wmtUSDC"),
  market("M02", "USDC"),
  market("M77", "Open"),
  market("M03", "2025-03-06"),
  market("G4", "Open term, allowlist, transfers restricted, MLA signed"),
  market("M86", "57.2%"),
  market("M59", "223"),
  market("M60", "206"),
  // 2.1 In order
  market("M18", "82.6"),
  // Exact seconds, per Andreas (product#908, 20 Oct 2026); the sheet had 0.34%.
  market("M26", "0.20%"),
  market("M05", "525"),
  market("M67", "77.8"),
  market("M68", "-4.8"),
  market("M20", "237"),
  // Hours display rounded up to one decimal (product#908, 20 Oct 2026).
  market("M80", "0.4"),
  // 2.2 Worst incident
  market("M24", "113.7%"),
  market("M23", "54.6"),
  market("M15", "48"),
  market("M25", "5"),
  market("M83", "97.9%"),
  // 2.3 Exits paid on time
  market("M32", "83.0"),
  market("M31", "268"),
  market("M30", "323"),
  market("M33", "83.0"),
  market("D18", "55 uncovered: [late] / [never], to be computed"),
  market("M37", "0"),
  market("M38", "1,519,472"),
  market("M58", "65,423,188"),
  market("M56", "299,275,673"),
  market("M57", "233,852,485"),
  market("M08", "1,565,141"),
  // 2.4 Right now
  market("M21", "0"),
  market("M85", "0"),
  // Blank: not late. The sheet prints "no countdown (not late)", which is the
  // page's sentence now, not the publication's.
  market("D05", ""),
  market("M84", "0.5"),
  market("M82", "0.4"),
  // 2.5 What it pays
  market("M11", "8.50%"),
  market("M13", "5.0%"),
  market("M39", "10.04%"),
  market("M42", "0.14%"),
  market("M27", "11,703"),
  market("M41", "8,500,026"),
  market("M40", "10.33%"),
  market("M44", "8"),
  // 2.6 How the line is used
  market("M06", "130,000,000"),
  market("M07", "75,913,003"),
  // 2.8 Incident history
  market("M69", "119"),
  market("M70", "103"),
  market("M71", "13"),
  market("M72", "2"),
  market("M22", "9.3"),
  // 2.9 Who funds it
  market("M48", "251"),
  market("M49", "591"),
  market("M51", "42.5%"),
  market("D10", "9.9%"),
  // 2.10 Terms
  market("M16", "24"),
  // Blank: no payout cycle is running (the page writes the sentence).
  market("D06", ""),
  market("M12", "+5.00"),
  market("M14", "0%"),
  market("D03", "TBD: read per market"),
  // Borrower header
  borrower("D11", "No defaults on record"),
  borrower("S01", "5"),
  borrower("S02", "2025-03-06"),
  borrower("S06", "82.6"),
  borrower("S07", "98.8"),
  // 3.1 In order, all markets
  borrower("S05", "92.1"),
  borrower("D21", "99.9"),
  borrower("S27", "89.8"),
  borrower("S28", "-2.3"),
  borrower("S14", "628"),
  borrower("S15", "547"),
  borrower("S16", "87.1"),
  borrower("S17", "83.0"),
  // 3.4 Right now, all markets
  borrower("S18", "1"),
  borrower("S35", "45,827,898"),
  borrower("S36", "0"),
  // 3.6 Completed credit cycle
  borrower("S31", "0"),
  borrower("S30", "0"),
  borrower("S32", "0%"),
  // The card shows "S33 of S30"; the sheet's "0 of 0".
  borrower("S33", "0"),
  borrower("S34", "0"),
  // 3.8 Discipline
  borrower("S12", "450"),
  borrower("D16", "9.6"),
  borrower("S13", "6"),
  // Hours in cheat sheet v4.2 (v4 printed 2.3 days).
  borrower("D15", "54.6"),
  // 3.10 Lender breadth
  // Token holders, as M49, per Andreas (product#908, 20 Oct 2026); was 753.
  borrower("S37", "797"),
  // 3.12 Trouble over time
  // Per market (H02 / 86,400), shown per market on borrower card 3.12.
  market("D17", "91.4"),
]

/**
 * Reference values that product#908 marks as provisional, or that the
 * fixtures show were computed differently from the cheat sheet v4 definition.
 * A metric that computes a different value here is reported, not failed.
 */
export const ACCEPTED_REFERENCE_DIFFERENCES: Record<string, string> = {
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
