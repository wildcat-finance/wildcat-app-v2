import { GridColDef } from "@mui/x-data-grid"

import { LenderPositionsData } from "@/app/[locale]/lender/profile/hooks/types"

export type BorrowerExposureTableProps = {
  lenderData?: LenderPositionsData
}

// Mirrors the markets-tables convention: `field` is constrained to keys of the
// row so columns stay in sync with rows.
export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

// One aggregated row per borrower: how much of the lender's active portfolio is
// exposed to that borrower, across how many markets.
export type BorrowerExposureRow = {
  id: string
  borrower: string
  borrowerName: string | undefined
  marketCount: number
  exposure: number
  share: number
  button: string
}

// Single-borrower exposure above this share of the portfolio is flagged as
// concentration risk.
export const CONCENTRATION_THRESHOLD = 50
export const CONCENTRATION_COPY =
  "Position size above 50% of portfolio in a single borrower is flagged as concentration risk."
