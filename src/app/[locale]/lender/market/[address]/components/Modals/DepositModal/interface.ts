import { Dispatch, SetStateAction } from "react"

import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { BorrowerPenaltyWarningState } from "@/app/[locale]/lender/market/[address]/hooks/useBorrowerPenaltyWarning"

export type DepositModalProps = {
  marketAccount: MarketAccount
  isMobileOpen?: boolean
  setIsMobileOpen?: Dispatch<SetStateAction<boolean>>
  setIsMobileAcknowledgementOpen?: Dispatch<SetStateAction<boolean>>
  borrowerPenaltyWarningState: BorrowerPenaltyWarningState
  refreshBorrowerPenaltyWarning: () => Promise<BorrowerPenaltyWarningState>
}
