import { GridRowsProp } from "@mui/x-data-grid"

import {
  MarketsTableModel,
  TypeSafeColDef,
} from "@/app/[locale]/lender/components/MarketsTab/interface"
import { MarketStatus } from "@/utils/marketStatus"

export type OtherMarketsTableProps = {
  isLoading: boolean

  tableColumns: TypeSafeColDef<MarketsTableModel>[]
  tableRows: GridRowsProp<MarketsTableModel> | []

  statusFilter?: MarketStatus[]
  assetFilter?: { name: string; address: string }[]
  nameFilter?: string
}
