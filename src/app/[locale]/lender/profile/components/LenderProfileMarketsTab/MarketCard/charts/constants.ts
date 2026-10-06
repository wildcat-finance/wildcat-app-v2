import { COLORS } from "@/theme/colors"

// ── Chart section colors (sampled from the Figma card design) ───────────────
// The design recolors the shared analytics charts, so these are kept local to
// the card rather than pulling from CHART_PALETTE (which the market-detail and
// portfolio charts use with a different mapping).

// "Yield vs withdrawal pressure"
export const YIELD_COLORS = {
  interest: "#849EFE", // periwinkle — interest-earned line
  deposits: "#28CAB7", // teal — lender deposits
  otherWithdrawals: COLORS.iron, // #D6D6DE — other-lender withdrawals
  lenderWithdrawals: "#F19FA4", // salmon — this lender's withdrawals
} as const

// "Capital-at-risk timeline" — each state stacks as a light tint fill with a
// saturated stroke line on top (matching the design's legend swatches).
export const RISK_COLORS = {
  healthy: { stroke: "#6687FF", fill: "#D5DCF6" },
  grace: { stroke: "#F9CF53", fill: "#FFEBB1" },
  penalty: { stroke: "#FA6F77", fill: "#FFD0D3" },
  withdrawalQueue: { stroke: "#28CA7C", fill: "#CFF0E1" },
  penaltyFees: COLORS.blackRock, // dashed cumulative penalty-fees line
} as const

// Light-grey rounded panel each chart section sits on.
export const CHART_PANEL_BG = "#F9F9FA"
export const CHART_PLOT_HEIGHT = 184

// Axis tick / caption text (grey-750 in the design).
export const CHART_AXIS_TEXT_COLOR = COLORS.matteSilver

// The app loads Inter via next/font, which renames the family to a hashed
// token — so read the resolved family off the body (where next/font applies it)
// rather than hard-coding "Inter", which the canvas renderer wouldn't match.
export const getInterFontFamily = () => {
  if (typeof document === "undefined") return "Inter"
  return getComputedStyle(document.body).fontFamily || "Inter"
}

// ── Range selector (3m / 1y / All) ──────────────────────────────────────────

export type ChartRange = "3m" | "1y" | "All"

export const CHART_RANGES: ChartRange[] = ["3m", "1y", "All"]

export const DEFAULT_CHART_RANGE: ChartRange = "1y"

const DAY_SECONDS = 86_400

const RANGE_LOOKBACK_SECONDS: Record<ChartRange, number | null> = {
  "3m": 90 * DAY_SECONDS,
  "1y": 365 * DAY_SECONDS,
  All: null,
}

// Trailing-window filter on a timestamp-keyed series. On testnets the only
// deposits can be older than the window, which would blank the chart — so if
// the window filters everything out we fall back to the full series.
export const filterByRange = <T extends { timestamp: number }>(
  data: T[],
  range: ChartRange,
): T[] => {
  const lookback = RANGE_LOOKBACK_SECONDS[range]
  if (lookback == null || data.length === 0) return data

  const cutoff = Math.floor(Date.now() / 1000) - lookback
  const filtered = data.filter((point) => point.timestamp >= cutoff)
  return filtered.length > 0 ? filtered : data
}

// ── Legend ──────────────────────────────────────────────────────────────────

export type LegendVariant = "line" | "square" | "outline" | "dashed"

export type LegendItem = {
  label: string
  color: string
  variant: LegendVariant
  // Interior fill for "outline" swatches (the design tints them, not hollow).
  fillColor?: string
}
