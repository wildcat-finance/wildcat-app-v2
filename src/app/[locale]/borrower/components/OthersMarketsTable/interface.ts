import { Market } from "@wildcatfi/wildcat-sdk"

export type OthersMarketsTableProps = {
  tableData: Market[] | undefined
  isLoading: boolean
  isOpen: boolean
}
