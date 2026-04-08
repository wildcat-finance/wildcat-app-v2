import { MarketType } from "@wildcatfi/wildcat-sdk"

export type MarketImplementationChipProps = {
  implementationType: MarketType
  type?: "table" | "market"
  isMobile?: boolean
}
