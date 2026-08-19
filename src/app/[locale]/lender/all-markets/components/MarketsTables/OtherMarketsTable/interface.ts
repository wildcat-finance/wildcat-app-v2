import {
  DepositStatus,
  MarketAccount,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import {
  MarketOnboardingByAddress,
  MarketOnboardingMode,
} from "@/utils/marketOnboarding"
import { getMarketImplementationType } from "@/utils/marketImplementation"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type OtherMarketsTableModel = {
  id: string
  implementationType: ReturnType<typeof getMarketImplementationType>
  chainId: number
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  borrower: string | undefined
  borrowerAddress: string | undefined
  asset: string
  debt: TokenAmount | undefined
  capacity: TokenAmount
  apr: number
  withdrawalBatchDuration: number
  onboardingMode: MarketOnboardingMode | undefined
  depositStatus: DepositStatus
  button?: string
  capacityLeft: TokenAmount
}

export type OtherMarketsTableProps = {
  marketAccounts: MarketAccount[]
  onboardingByMarket: MarketOnboardingByAddress
  borrowers: BorrowerWithName[]
  isLoading: boolean
  filters: {
    nameFilter: string
    assetFilter: SmallFilterSelectItem[]
    statusFilter: MarketStatus[]
  }
}
