import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { BorrowerWithdrawalsForMarketResult } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"

export type MarketWithdrawalRequestsProps = {
  marketAccount: MarketAccount
  withdrawals: BorrowerWithdrawalsForMarketResult
  isHoldingMarket: boolean
}

export type WithdrawalTxRow = {
  id: string
  lender: string
  transactionId: string
  dateSubmitted: string
  amount: string
}
