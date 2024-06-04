import { Market } from "@wildcatfi/wildcat-sdk"

export type BorrowerMarketsTableProps = {
  type?: "active" | "terminated"
  label: string
  noMarketsTitle: string
  noMarketsSubtitle: string
  tableData: Market[] | []
  isLoading: boolean
  isOpen?: boolean

  statusFilter?: string
  assetFilter?: string
  nameFilter?: string
}
