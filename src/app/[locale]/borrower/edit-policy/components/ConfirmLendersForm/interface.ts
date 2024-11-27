import { GridColDef } from "@mui/x-data-grid"
import { MarketController } from "@wildcatfi/wildcat-sdk"
import { HooksInstance } from "@wildcatfi/wildcat-sdk/dist/access"

import { PolicyLenderMarketTableDataType } from "../../interface"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type ConfirmLendersTableModel = {
  id: string
  name: string
  address: string
  activeMarkets: PolicyLenderMarketTableDataType[]
}

export type ConfirmLendersFormProps = {
  originalPolicyName: string
  pendingPolicyName: string
  policy?: HooksInstance
  controller?: MarketController
}
