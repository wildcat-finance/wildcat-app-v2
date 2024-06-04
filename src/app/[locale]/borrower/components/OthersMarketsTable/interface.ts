import { Market } from "@wildcatfi/wildcat-sdk"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"

export type OthersMarketsTableProps = {
  tableData: Market[] | []
  borrowersData: BorrowerWithName[] | []
  isLoading: boolean
  isOpen: boolean

  statusFilter?: string
  assetFilter?: string
  nameFilter?: string
}
