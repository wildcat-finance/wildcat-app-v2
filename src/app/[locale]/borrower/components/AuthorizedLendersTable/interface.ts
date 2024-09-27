import { GridColDef } from "@mui/x-data-grid"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type MarketDataT = {
  name: string
  address: string
}

export type LendersTableModal = {
  id: string
  authorized: boolean
  name: string
  address: string
  markets: MarketDataT[]
}

export type LendersDataT = {
  isAuthorized: boolean
  address: string
  markets: MarketDataT[]
}

export type LendersTableProps = {
  label: string
  tableData: LendersDataT[]
  isOpen?: boolean
  isLoading: boolean
}
