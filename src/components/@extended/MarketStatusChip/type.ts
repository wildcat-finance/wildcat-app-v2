import { Market } from "@wildcatfi/wildcat-sdk"

import { MarketStatus } from "@/utils/marketStatus"

export type MarketStatusChipProps = {
  variant?: "filled" | "text"
  market: Market
  status: {
    status: MarketStatus
    healthyPeriod: number | null
    penaltyPeriod: number
    delinquencyPeriod?: number
  }
}
