import { GridColDef } from "@mui/x-data-grid"

import { LenderKycWalletRow } from "@/lib/lenderKyc/types"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type LenderKycFilter = "all" | "withDetails"

export type LenderKycTableRow = LenderKycWalletRow & {
  id: string
  name?: string
  email?: string
  company?: string
  lenderType?: string
}
