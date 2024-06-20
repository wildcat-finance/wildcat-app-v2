import { Market } from "@wildcatfi/wildcat-sdk"

import { BorrowerWithdrawalsForMarketResult } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"
import { MarketBarChartItem } from "@/components/BarChart/BarItem/interface"

export type DelinquentCollateralObligationsProps = {
  market: Market
  legendItem: MarketBarChartItem
  withdrawals: BorrowerWithdrawalsForMarketResult
}
