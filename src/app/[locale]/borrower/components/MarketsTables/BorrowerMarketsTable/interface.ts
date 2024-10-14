import { Market } from "@wildcatfi/wildcat-sdk"

import { MarketStatus } from "@/utils/marketStatus"

export type BorrowerMarketsTableProps = {
  type?: "active" | "terminated"
  label: string
  noMarketsTitle: string
  noMarketsSubtitle: string
  tableData: Market[] | []
  isLoading: boolean
  isOpen?: boolean

  statusFilter?: MarketStatus[]
  assetFilter?: { name: string; address: string }[]
  nameFilter?: string
}
