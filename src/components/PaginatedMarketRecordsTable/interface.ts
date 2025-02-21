import { GridColDef } from "@mui/x-data-grid"
import { Market, MarketRecord } from "@wildcatfi/wildcat-sdk"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type MarketRecordsTableProps = {
  market: Market
  records?: MarketRecord[]
  isLoading?: boolean
  pageSize: number
  setPageSize: (pageSize: number) => void
  page: number
  setPage: (page: number) => void
  rowCount?: number
}
