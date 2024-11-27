import { GridColDef } from "@mui/x-data-grid"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"

import { getMarketStatusChip } from "@/utils/marketStatus"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type MarketsTableModel = {
  id: string
  status: ReturnType<typeof getMarketStatusChip>
  name: string
  borrowerName?: string
  asset: string
  lenderAPR: number
  crr: number
  maxCapacity: TokenAmount
  loan?: TokenAmount
  lend: TokenAmount
  deploy: number
  selfOnboard?: boolean
}

export type MarketsTabProps = {
  showConnectedData: boolean
}
