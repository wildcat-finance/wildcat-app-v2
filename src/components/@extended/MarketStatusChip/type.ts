import { MarketStatus } from "@/utils/marketStatus"

export type MarketStatusChipProps = {
  variant?: "filled" | "text"
  withPeriod?: boolean
  // Where a defaulted market's penalty caption goes: under the chip or beside it
  periodLayout?: "stacked" | "inline"
  status: {
    status: MarketStatus
    healthyPeriod: number | null
    penaltyPeriod: number
    delinquencyPeriod?: number
  }
}
