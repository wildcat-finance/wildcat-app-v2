import { GridColDef } from "@mui/x-data-grid"

import { PolicyLenderMarketTableDataType } from "../../interface"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type ConfirmLendersTableModel = {
  id: string
  name: string
  address: string
  activeMarkets: PolicyLenderMarketTableDataType[]
}
