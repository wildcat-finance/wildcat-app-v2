import { GridColDef } from "@mui/x-data-grid"

// Mirrors the markets-tables convention: `field` is constrained to keys of the
// row so columns stay in sync with rows.
export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type ActivityType =
  | "Deposit"
  | "Withdrawal Request"
  | "Withdrawal Execution"

// One row per deposit / withdrawal-request / withdrawal-execution event.
export type TransactionTableRow = {
  id: string
  date: string
  timestamp: number
  market: string
  marketId: string
  borrower: string
  borrowerName: string | undefined
  type: ActivityType
  amountUsd: number
  // The lender's current balance held in that market's protocol.
  balanceInProtocol: number
  txHash: string
}
