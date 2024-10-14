import { Market } from "@wildcatfi/wildcat-sdk"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { MarketStatus } from "@/utils/marketStatus"

export type OthersMarketsTableProps = {
  tableData: Market[] | []
  borrowersData: BorrowerWithName[] | []
  isLoading: boolean
  isOpen: boolean

  statusFilter?: MarketStatus[]
  assetFilter?: { name: string; address: string }[]
  nameFilter?: string
}
