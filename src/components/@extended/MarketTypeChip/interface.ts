import { HooksKind } from "@wildcatfi/wildcat-sdk"

export type MarketTypeChipProps = {
  kind: HooksKind
  fixedPeriod?: number
  /** Unix seconds of the fixed term maturity, rendered in UTC. */
  fixedTermEndTime?: number
  type?: "table" | "market"
  isMobile?: boolean
}
