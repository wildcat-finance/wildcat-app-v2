import { MarketAccount } from "@wildcatfi/wildcat-sdk"

export type MarketWithdrawalRequestsProps = {
  marketAccount: MarketAccount
}

export type WithdrawalTxRow = {
  id: string
  lender: string
  transactionId: string
  dateSubmitted: string
  claimable: string
  amount: string
}
