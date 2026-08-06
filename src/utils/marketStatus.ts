import { Market } from "@wildcatfi/wildcat-sdk"

import { secondsToDays } from "@/utils/formatters"

export enum MarketStatus {
  HEALTHY = "Healthy",
  DELINQUENT = "Pending",
  PENALTY = "Penalty",
  TERMINATED = "Terminated",
}

export const getMarketStatus = (
  isClosed: boolean,
  isDelinquent: boolean,
  isIncurringPenalties: boolean,
): MarketStatus => {
  if (isClosed) return MarketStatus.TERMINATED
  if (isIncurringPenalties) return MarketStatus.PENALTY
  if (isDelinquent) return MarketStatus.DELINQUENT
  return MarketStatus.HEALTHY
}

export const EXPLORE_ALLOWED_STATUSES = [
  MarketStatus.HEALTHY,
  MarketStatus.DELINQUENT,
]

export const isExploreVisible = (market: Market): boolean =>
  EXPLORE_ALLOWED_STATUSES.includes(
    getMarketStatus(
      market.isClosed,
      market.isDelinquent || market.willBeDelinquent,
      market.isIncurringPenalties,
    ),
  ) && market.maxTotalSupply.gt(market.totalSupply)

export const isMarketHealthy = (market: Market): boolean =>
  getMarketStatus(
    market.isClosed,
    market.isDelinquent || market.willBeDelinquent,
    market.isIncurringPenalties,
  ) === MarketStatus.HEALTHY

export const isMarketInPenalty = (market: Market): boolean =>
  getMarketStatus(
    market.isClosed,
    market.isDelinquent || market.willBeDelinquent,
    market.isIncurringPenalties,
  ) === MarketStatus.PENALTY

// Ninety days at the penalty rate is a default. `timeDelinquent` counts up while
// the market is delinquent and down while it is healthy, so the margin over the
// grace period is cumulative time at the penalty rate, which is the measure the
// loan agreement uses. What this does not check is the agreement's other limb, an
// unhonoured withdrawal request: a market can sit below its reserve ratio and
// accrue penalty time with nothing queued, and is still counted here.
// closeMarket() zeroes `timeDelinquent`, so a market that defaulted and was later
// closed is not counted.
export const PENALTY_DEFAULT_THRESHOLD_SECONDS = 90 * 24 * 60 * 60

export const isMarketInDefault = (market: Market): boolean =>
  !market.isClosed &&
  market.timeDelinquent - market.delinquencyGracePeriod >=
    PENALTY_DEFAULT_THRESHOLD_SECONDS

export const countMarketsInDefault = (
  markets: Market[] | undefined,
): number | undefined => markets?.filter(isMarketInDefault).length

export const getPenaltyBorrowers = (markets: Market[]): Set<string> =>
  new Set(
    markets
      .filter(isMarketInPenalty)
      .map((market) => market.borrower.toLowerCase()),
  )

export const getMarketStatusChip = (market: Market) => {
  const delinquencyPeriod =
    market.timeDelinquent > market.delinquencyGracePeriod
      ? 0
      : market.delinquencyGracePeriod - market.timeDelinquent
  const penaltyPeriod = market.timeDelinquent - market.delinquencyGracePeriod

  return {
    status: getMarketStatus(
      market.isClosed,
      market.isDelinquent || market.willBeDelinquent,
      market.isIncurringPenalties,
    ),
    healthyPeriod:
      market.totalDebts.gt(0) &&
      market.effectiveBorrowerAPR.gt(0) &&
      market.reserveRatioBips !== 0 &&
      market.secondsBeforeDelinquency > 0 &&
      market.secondsBeforeDelinquency < Number.MAX_SAFE_INTEGER
        ? market.secondsBeforeDelinquency * 1000
        : null,
    penaltyPeriod: secondsToDays(penaltyPeriod),
    delinquencyPeriod: secondsToDays(delinquencyPeriod),
  }
}
