import { MarketStatus } from "@/utils/marketStatus"

export type MarketStatusChipProps = {
  variant?: "filled" | "text"
  status: {
    status: MarketStatus
    healthyPeriod: number | null
    penaltyPeriod: number
    delinquencyPeriod?: number
  }
}
