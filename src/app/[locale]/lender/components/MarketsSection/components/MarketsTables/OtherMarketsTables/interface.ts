import {
  DepositStatus,
  MarketAccount,
  MarketOnboardingMode,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { getMarketImplementationType } from "@/utils/marketImplementation"
import { MarketLiveDataStatus } from "@/utils/marketLiveData"
import { LenderMarketAction } from "@/utils/marketOnboarding"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type LenderOtherMarketsTableModel = {
  id: string
  chainId?: number
  implementationType: ReturnType<typeof getMarketImplementationType>
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  borrower: string | undefined
  borrowerAddress: string | undefined
  asset: string
  debt: TokenAmount | undefined
  apr: number
  withdrawalBatchDuration: number
  onboardingMode?: MarketOnboardingMode
  depositStatus: DepositStatus
  action: LenderMarketAction
  button?: string
  capacityLeft: TokenAmount
}

export type LenderOtherMarketsTableProps = {
  marketAccounts: MarketAccount[]
  borrowers: BorrowerWithName[]
  isLoading: boolean
  liveDataStatus: MarketLiveDataStatus
  filters: {
    nameFilter: string
    assetFilter: SmallFilterSelectItem[]
    statusFilter: MarketStatus[]
  }
}
