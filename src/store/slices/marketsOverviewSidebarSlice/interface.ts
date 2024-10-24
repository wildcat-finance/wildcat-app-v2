import { MarketStatus } from "@/utils/marketStatus"

export type MarketsOverviewSidebarSliceType = {
  activeMarketsAmount?: string
  terminatedMarketsAmount?: string
  otherMarketsAmount?: string

  marketName: string
  marketsStatuses: MarketStatus[]
  marketsAssets: { name: string; address: string }[]

  scrollTarget: string | null
}
