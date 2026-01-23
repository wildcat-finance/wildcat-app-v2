import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type LenderTerminatedMarketsTableModel = {
  id: string
  chainId?: number
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  borrower: string | undefined
  borrowerAddress: string | undefined
  asset: string
  debt: TokenAmount | undefined
  loan: TokenAmount | undefined
  apr: number
  withdrawalBatchDuration: number
  hasEverInteracted: boolean
  button?: string
  hasTokens?: boolean
}

export type LenderTerminatedMarketsTableProps = {
  marketAccounts: MarketAccount[]
  borrowers: BorrowerWithName[]
  isLoading: boolean
  filters: {
    nameFilter: string
    assetFilter: SmallFilterSelectItem[]
    statusFilter: MarketStatus[]
  }
}
