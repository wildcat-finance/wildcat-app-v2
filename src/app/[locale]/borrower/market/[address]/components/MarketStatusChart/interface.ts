import { Market } from "@wildcatfi/wildcat-sdk"

import { BorrowerWithdrawalsForMarketResult } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"

export type MarketStatusChartProps = {
  market: Market
  withdrawals?: BorrowerWithdrawalsForMarketResult
}
