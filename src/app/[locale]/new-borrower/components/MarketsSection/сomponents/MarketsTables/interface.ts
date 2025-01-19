import { GridColDef } from "@mui/x-data-grid"
import { Market } from "@wildcatfi/wildcat-sdk"

export type BorrowerMarketsTablesType = {
  markets: Market[]
  isLoading: boolean
}

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }
