import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { BorrowerPenaltyWarningState } from "@/app/[locale]/lender/market/[address]/hooks/useBorrowerPenaltyWarning"
import { LenderWithdrawalsForMarketResult } from "@/app/[locale]/lender/market/[address]/hooks/useGetLenderWithdrawals"

export type MarketActionsProps = {
  marketAccount: MarketAccount
  withdrawals: LenderWithdrawalsForMarketResult
  borrowerPenaltyWarningState: BorrowerPenaltyWarningState
  refreshBorrowerPenaltyWarning: () => Promise<BorrowerPenaltyWarningState>
}
