import { GridColDef } from "@mui/x-data-grid"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"

import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type MarketsTableModel = {
  id: string
  status: ReturnType<typeof getMarketStatusChip>
  marketType: ReturnType<typeof getMarketTypeChip>
  name: string
  borrowerName?: string
  asset: string
  lenderAPR: number
  crr: number
  maxCapacity: TokenAmount
  borrowable: TokenAmount
  deploy: number
}
