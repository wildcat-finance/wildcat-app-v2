import { MarketKind } from "@wildcatfi/wildcat-sdk"

export type MarketImplementationChipProps = {
  implementationType: MarketKind
  type?: "table" | "market"
  isMobile?: boolean
}
