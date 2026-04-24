import { GridColDef } from "@mui/x-data-grid"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"

import { getMarketImplementationType } from "@/utils/marketImplementation"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type MarketsTableModel = {
  id: string
  chainId?: number
  implementationType: ReturnType<typeof getMarketImplementationType>
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  borrowerName?: string
  asset: string
  lenderAPR: number
  crr: number
  maxCapacity: TokenAmount
  borrowable: TokenAmount
  deploy: number
}
