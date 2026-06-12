import { HooksKind } from "@wildcatfi/wildcat-sdk"

import { PeriodicSchedule } from "@/utils/periodicWithdrawalWindow"

export type MarketTypeChipProps = {
  kind: HooksKind
  fixedPeriod?: number
  /**
   * Raw periodic schedule; the chip computes window state live from it so the
   * countdown and open/closed flip stay current without parent re-renders.
   */
  periodicWindow?: PeriodicSchedule & {
    isTermClosed: boolean
  }
  type?: "table" | "market"
  isMobile?: boolean
}
