import { GridColDef } from "@mui/x-data-grid"

import { LenderPositionsData } from "@/app/[locale]/lender/profile/hooks/types"

export type MarketYieldTableProps = {
  lenderAddress?: `0x${string}`
  lenderData?: LenderPositionsData
}

// Mirrors the markets-tables convention: `field` is constrained to keys of the
// row so columns stay in sync with rows.
export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

// One row per market the lender holds a position in: how much interest it
// earned, split into base vs penalty, and its share of the lender's portfolio.
export type MarketYieldRow = {
  id: string
  marketId: string
  name: string
  borrower: string
  borrowerName: string | undefined
  interest: number
  baseUsd: number
  penaltyUsd: number
  share: number
  // Render-only duplicate of `share` so the proportional bar can live in its own
  // column (separate from the numeric %), keeping bars aligned across rows.
  shareBar: number
  button: string
}

// A single market above this share of the portfolio is flagged as
// concentration risk.
export const CONCENTRATION_THRESHOLD = 50
export const CONCENTRATION_COPY =
  "Position above 50% of portfolio in a single market is flagged as concentration risk."
