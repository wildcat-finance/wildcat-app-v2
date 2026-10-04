import type { Market } from "@wildcatfi/wildcat-sdk"

import { SDK_ERRORS_MAPPING } from "./errors"

/** Use observed SDK state. A browser clock cannot establish on-chain lifecycle state. */
export const getAprChangeError = (market: Market, proposing = false) => {
  if (market.isClosed) return "Market is closed"
  if (proposing) {
    return market.hasFrozenHookParameters
      ? SDK_ERRORS_MAPPING.proposeApr.MarketInRepayment
      : undefined
  }
  return market.hasReachedRepaymentDate
    ? "APR and reserve ratio cannot be changed after the repayment date"
    : undefined
}
