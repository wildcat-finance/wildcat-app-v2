import { DepositStatus } from "@wildcatfi/wildcat-sdk"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { MarketStatus } from "@/utils/marketStatus"

export interface MarketData {
  address: string
  name: string
  borrower: string
  aprBps: number
  underlyingToken: {
    symbol: string
    decimals: number
  }
  maxTotalSupply: string
  totalSupply: string
  isDelinquent: boolean
  status: MarketStatus
  secondsBeforeDelinquency?: number
  timeDelinquent?: number
  delinquencyGracePeriod?: number
  isIncurringPenalties?: boolean
  isClosed?: boolean
  willBeDelinquent?: boolean
  term: string
}

export interface MarketAccount {
  market: MarketData
  depositAvailability: DepositStatus
}

export interface NonDepositedTableProps {
  marketAccounts?: MarketAccount[]
  isLoading: boolean
  borrowers: BorrowerWithName[]
  filters: {
    nameFilter: string
    assetFilter: SmallFilterSelectItem[]
    statusFilter: MarketStatus[]
  }
  isMobile?: boolean
}

export interface LenderMarketsTableProps {
  markets: MarketAccount[]
  borrowers: BorrowerWithName[]
  isLoading: boolean
} 