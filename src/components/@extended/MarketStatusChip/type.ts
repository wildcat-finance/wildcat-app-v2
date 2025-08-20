import { MarketStatus } from "@/utils/marketStatus"

export type MarketStatusChipProps = {
  variant?: "filled" | "text"
  withPeriod?: boolean
  status: {
    status: MarketStatus
    healthyPeriod: number | null
    penaltyPeriod: number
    delinquencyPeriod?: number
  }
}
