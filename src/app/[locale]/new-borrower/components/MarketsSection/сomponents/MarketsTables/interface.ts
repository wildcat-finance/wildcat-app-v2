import { GridColDef } from "@mui/x-data-grid"
import { Market, MarketAccount } from "@wildcatfi/wildcat-sdk"

import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { MarketStatus } from "@/utils/marketStatus"

export type MarketsTablesProps = {
  marketAccounts: MarketAccount[]
  isLoading: boolean
  filters: {
    nameFilter: string
    assetFilter: SmallFilterSelectItem[]
    statusFilter: MarketStatus[]
  }
}

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }
