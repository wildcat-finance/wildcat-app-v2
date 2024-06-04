import { Market } from "@wildcatfi/wildcat-sdk"

export type BorrowerMarketsTableProps = {
  label: string
  noMarketsTitle: string
  noMarketsSubtitle: string
  tableData: Market[] | []
  isLoading: boolean
  isOpen?: boolean

  statusFilter?: string
  assetFilter?: string
}
