import { HooksKind } from "@wildcatfi/wildcat-sdk"

export type MarketTypeChipProps = {
  kind: HooksKind
  fixedPeriod?: number
  periodicWindow?: {
    isOpen: boolean
    isTermClosed: boolean
    msUntilBoundary: number
  }
  type?: "table" | "market"
  isMobile?: boolean
}
