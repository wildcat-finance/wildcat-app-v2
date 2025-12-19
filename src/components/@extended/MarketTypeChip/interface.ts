import { HooksKind } from "@wildcatfi/wildcat-sdk"

export type MarketTypeChipProps = {
  kind: HooksKind
  fixedPeriod?: number
  type?: "table" | "market"
  isMobile?: boolean
}
