import { GridColDef } from "@mui/x-data-grid"

import { LenderKycWalletRow } from "@/lib/lenderKyc/types"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type LenderKycFilter = "all" | "withDetails"

export type LenderKycOutcomeKey =
  | "submitted"
  | "updated"
  | "unchanged"
  | "skipped"
  | "closed"
  | "notSignedDeclined"
  | "notSignedWalletMismatch"
  | "notSigned"
  | "pending"

export type LenderKycTableRow = LenderKycWalletRow & {
  id: string
  isSample: boolean
  name?: string
  email?: string
  company?: string
  lenderType?: string
}
