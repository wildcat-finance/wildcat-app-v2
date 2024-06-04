import { Market } from "@wildcatfi/wildcat-sdk"

export type OthersMarketsTableProps = {
  tableData: Market[] | []
  isLoading: boolean
  isOpen: boolean

  statusFilter?: string
  assetFilter?: string
}
