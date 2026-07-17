import { Market } from "@wildcatfi/wildcat-sdk"

import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

// Reuse the SDK's TokenAmount shape without importing it directly.
type TokenAmt = Market["maxTotalSupply"]

export type BorrowerMarketHealthRow = {
  id: string
  chainId: number
  name: string
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  asset: string
  withdrawalBatchDuration: number
  apr: number // annualInterestBips
  debt: TokenAmt
  remaining: TokenAmt
  utilization: number
  borrow: string
}
