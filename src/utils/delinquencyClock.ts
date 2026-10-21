export type DelinquencyClockState = {
  isClosed: boolean
  isDelinquent: boolean
  timeDelinquent: number
  delinquencyGracePeriod: number
  lastInterestAccruedTimestamp: number
}

/**
 * Projects the protocol's delinquency clock forward from the latest lens read.
 * The clock rises while the market is delinquent and burns back down while it
 * is healthy, matching FeeMath.updateTimeDelinquentAndGetPenaltyTime().
 */
export const getLiveTimeDelinquent = (
  market: DelinquencyClockState,
  nowSec: number = Date.now() / 1000,
): number => {
  if (market.isClosed) return 0

  const elapsed = Math.max(
    0,
    Math.floor(nowSec) - market.lastInterestAccruedTimestamp,
  )

  return market.isDelinquent
    ? market.timeDelinquent + elapsed
    : Math.max(0, market.timeDelinquent - elapsed)
}

export const getLiveGracePeriodState = (
  market: DelinquencyClockState,
  nowSec: number = Date.now() / 1000,
) => {
  const timeDelinquent = getLiveTimeDelinquent(market, nowSec)
  const gracePeriodDelta = timeDelinquent - market.delinquencyGracePeriod

  return {
    timeDelinquent,
    isIncurringPenalties: gracePeriodDelta > 0,
    timerSeconds: Math.abs(gracePeriodDelta),
  }
}

/** Whether this market still has a grace-period value that can move. */
export const hasLiveDelinquencyClock = (
  market: DelinquencyClockState,
  nowSec: number = Date.now() / 1000,
): boolean =>
  !market.isClosed &&
  (market.isDelinquent || getLiveTimeDelinquent(market, nowSec) > 0)
