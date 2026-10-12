import type { Market } from "@wildcatfi/wildcat-sdk"

import {
  getMarketAprDisplayBips,
  isRevolvingAprMarket,
} from "@/utils/marketApr"

export const getRevolvingAprCurve = (market: Market) => {
  if (!isRevolvingAprMarket(market) || market.isClosed) return undefined

  const apr = getMarketAprDisplayBips(market)
  if (
    apr.commitmentAprBips === undefined ||
    apr.utilizationBips === undefined
  ) {
    return undefined
  }

  const penaltyAprBips = market.isIncurringPenalties
    ? market.delinquencyFeeBips
    : 0
  // Commitment interest accrues on full supply; utilization interest on drawn
  // capital. Protocol interest is paid separately, not deducted from lender APR.
  const minimumAprBips = apr.commitmentAprBips + penaltyAprBips
  return {
    minimumAprBips,
    maximumAprBips: minimumAprBips + apr.configuredAprBips,
    currentAprBips: apr.currentEffectiveLenderAprBips,
    utilizationBips: apr.utilizationBips,
    penaltyAprBips,
  }
}
