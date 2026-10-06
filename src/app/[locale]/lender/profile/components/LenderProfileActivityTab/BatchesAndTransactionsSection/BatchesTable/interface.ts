import { GridColDef } from "@mui/x-data-grid"

import { LenderBatchRow } from "@/app/[locale]/lender/profile/hooks/types"

import type { BatchStatus } from "../StatusPillChip"

// Mirrors the markets-tables convention: `field` is constrained to keys of the
// row so columns stay in sync with rows.
export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

// One row per withdrawal batch the lender has across their markets.
export type BatchTableRow = {
  id: string
  marketId: string
  marketName: string
  borrower: string
  borrowerName: string | undefined
  expiry: string
  requested: number
  withdrawn: number
  remaining: number
  status: BatchStatus
  // Batch creation time (unix seconds) for time-range filtering.
  createdAt: number
  // The batch's creation transaction hash, shown/linked in the "Tx" column.
  txHash: string
}

// Same status priority the activity tab already uses (completed → expired →
// closed → pending).
export const getBatchStatusLabel = (batch: LenderBatchRow): BatchStatus => {
  if (batch.isCompleted) return "Completed"
  if (batch.isExpired) return "Expired"
  if (batch.isClosed) return "Closed"
  return "Pending"
}
