import { MarketStatus } from "@/utils/marketStatus"

export type MarketStatusChipProps = {
  variant?: "filled" | "text"
  status: MarketStatus
  timeHealthy?: string
}
