import { GridColDef } from "@mui/x-data-grid"

import { PolicyLenderMarketTableDataType } from "@/app/[locale]/borrower/edit-policy/interface"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type EditPolicyLendersTableModel = {
  id: string
  name: string
  address: string
  credentialSource: string
  credentialExpiry: number | undefined
  markets: PolicyLenderMarketTableDataType[]
  delete: string
}
