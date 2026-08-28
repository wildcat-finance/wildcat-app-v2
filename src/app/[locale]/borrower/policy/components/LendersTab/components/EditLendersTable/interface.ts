import { GridColDef } from "@mui/x-data-grid"

import { MarketTableDataType } from "@/app/[locale]/borrower/edit-lenders-list/interface"
import type { PolicyLenderAccessSource } from "@/utils/policyLenderAccess"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type EditLendersTableModel = {
  id: string
  name: string
  address: string
  markets: MarketTableDataType[]
  accessSources: PolicyLenderAccessSource[]
  delete: string
}
