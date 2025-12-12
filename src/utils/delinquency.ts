import { Market } from "@wildcatfi/wildcat-sdk"

export type DelinquencyProjection = {
  projectedTimeDelinquent: number
  projectedGraceRemaining: number
  isIncurringPenalties: boolean
}

/**
 * timeDelinquent on-chain has a bug when delinquent APR is 0.  timeDelinquent is
 * not updated. This is a workaround to evaluate a penalty state on the front-end,
 * Project it using the last accrual timestamp and surface penalty states.
 */
export const getDelinquencyProjection = (
  market: Market,
  nowMs = Date.now(),
): DelinquencyProjection => {
  const nowSeconds = Math.floor(nowMs / 1000)
  const elapsed = Math.max(0, nowSeconds - market.lastInterestAccruedTimestamp)
  const currentlyDelinquent = market.isDelinquent

  // If a penalty fee exists, trust the on-chain timer; otherwise (fee = 0) fall
  // back to elapsed time while delinquent because timeDelinquent may not move.
  const useOnChainTimer = market.delinquencyFeeBips > 0

  let projectedTimeDelinquent: number
  if (currentlyDelinquent) {
    projectedTimeDelinquent = useOnChainTimer ? market.timeDelinquent : elapsed
  } else {
    projectedTimeDelinquent = Math.max(0, market.timeDelinquent - elapsed)
  }

  const projectedGraceRemaining = Math.max(
    0,
    market.delinquencyGracePeriod - projectedTimeDelinquent,
  )

  return {
    projectedTimeDelinquent,
    projectedGraceRemaining,
    isIncurringPenalties:
      currentlyDelinquent &&
      projectedTimeDelinquent > market.delinquencyGracePeriod,
  }
}
