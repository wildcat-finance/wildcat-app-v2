import { BasicLenderData, Market, MarketAccount } from "@wildcatfi/wildcat-sdk"

export type ForceBuyBackModalProps = {
  market: Market
  // Borrower's market account
  marketAccount: MarketAccount
  lender: BasicLenderData
  lenderName?: string
  disableForceBuyBackButton: boolean
}
