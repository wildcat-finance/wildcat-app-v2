import { Market } from "@wildcatfi/wildcat-sdk"

export type DelinquencyProjection = {
  projectedTimeDelinquent: number
  projectedGraceRemaining: number
  isIncurringPenalties: boolean
}

/**
 * timeDelinquent on-chain ohas a but when delinquent APR is 0.  timeDelinquent is
 * not updated. This is a workaround to evaluate a penalty state on the front-end,
 * Project it using the last accrual timestamp and surface penalty states.
 */
export const getDelinquencyProjection = (
  market: Market,
  nowMs = Date.now(),
): DelinquencyProjection => {
  const nowSeconds = Math.floor(nowMs / 1000)
  const elapsed = Math.max(0, nowSeconds - market.lastInterestAccruedTimestamp)
  const currentlyDelinquent = market.isDelinquent || market.willBeDelinquent

  const projectedTimeDelinquent = currentlyDelinquent
    ? market.timeDelinquent + elapsed
    : Math.max(0, market.timeDelinquent - elapsed)

  const projectedGraceRemaining = Math.max(
    0,
    market.delinquencyGracePeriod - projectedTimeDelinquent,
  )

  return {
    projectedTimeDelinquent,
    projectedGraceRemaining,
    isIncurringPenalties:
      projectedTimeDelinquent > market.delinquencyGracePeriod,
  }
}
