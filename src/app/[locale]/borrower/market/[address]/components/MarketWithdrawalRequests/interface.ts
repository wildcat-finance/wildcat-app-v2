import { Market } from "@wildcatfi/wildcat-sdk"

export type MarketWithdrawalRequestsProps = {
  market: Market | undefined
}

export type WithdrawalTxRow = {
  id: string
  lender: string
  transactionId: string
  dateSubmitted: string
  claimable: string
  amount: string
}
