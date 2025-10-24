import { Market, MarketAccount } from "@wildcatfi/wildcat-sdk"

import { BorrowerWithdrawalsForMarketResult } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"

export type MarketTransactionsProps = {
  market: Market
  marketAccount: MarketAccount
  withdrawals: BorrowerWithdrawalsForMarketResult
  holdTheMarket: boolean
}
