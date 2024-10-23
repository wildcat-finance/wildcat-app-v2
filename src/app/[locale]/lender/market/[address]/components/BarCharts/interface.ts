import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { LenderMarketSections } from "@/store/slices/lenderMarketRoutingSlice/lenderMarketRoutingSlice"

export type BarChartProps = {
  marketAccount: MarketAccount
  section?: LenderMarketSections
}
