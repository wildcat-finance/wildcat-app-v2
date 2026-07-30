import { GridColDef } from "@mui/x-data-grid"
import { Market, MarketAccount } from "@wildcatfi/wildcat-sdk"

import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { MarketLiveDataStatus } from "@/utils/marketLiveData"
import { MarketStatus } from "@/utils/marketStatus"

export type MarketsTablesProps = {
  marketAccounts: MarketAccount[]
  isLoading: boolean
  liveDataStatus: MarketLiveDataStatus
  filters: {
    nameFilter: string
    assetFilter: SmallFilterSelectItem[]
    statusFilter: MarketStatus[]
  }
}

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }
