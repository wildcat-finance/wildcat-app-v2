import { Market } from "@wildcatfi/wildcat-sdk"

export type BorrowerMarketsTableProps = {
  label: string
  noMarketsTitle: string
  noMarketsSubtitle: string
  tableData: Market[] | undefined
  isLoading: boolean
  isOpen?: boolean
}
