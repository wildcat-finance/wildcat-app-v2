import { GridColDef } from "@mui/x-data-grid"

import { LendersDataT } from "@/app/[locale]/borrower/edit-lenders/lendersMock"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type LendersTableModal = {
  id: string
  authorized: boolean
  name: string
  address: string
  markets: { name: string; address: string }[]
}

export type LendersTableProps = {
  label: string
  tableData: LendersDataT[]
  isOpen?: boolean
  isLoading: boolean
}
