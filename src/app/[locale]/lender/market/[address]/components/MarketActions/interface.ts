import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { BorrowerPenaltyWarningState } from "@/app/[locale]/lender/market/[address]/hooks/useBorrowerPenaltyWarning"
import { LenderWithdrawalsForMarketResult } from "@/app/[locale]/lender/market/[address]/hooks/useGetLenderWithdrawals"
import { LenderAccessState } from "@/app/[locale]/lender/market/[address]/utils"

export type MarketActionsProps = {
  marketAccount: MarketAccount
  withdrawals: LenderWithdrawalsForMarketResult
  accessState: LenderAccessState
  borrowerPenaltyWarningState: BorrowerPenaltyWarningState
  refreshBorrowerPenaltyWarning: () => Promise<BorrowerPenaltyWarningState>
}
