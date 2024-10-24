import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { LenderWithdrawalsForMarketResult } from "@/app/[locale]/lender/market/[address]/hooks/useGetLenderWithdrawals"

export type MarketActionsProps = {
  marketAccount: MarketAccount
  withdrawals: LenderWithdrawalsForMarketResult
}
