import { Market } from "@wildcatfi/wildcat-sdk"

export type BorrowerActiveMarketsTableProps = {
  tableData: Market[] | undefined
  isLoading: boolean
}
