import { GridColDef } from "@mui/x-data-grid"

import { MarketTableDataType } from "@/app/[locale]/borrower/edit-lenders-list/interface"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type EditLendersTableModel = {
  id: string
  name: string
  address: string
  markets: MarketTableDataType[]
  delete: string
}
