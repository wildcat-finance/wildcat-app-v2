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

// Terms of Use 6.2: a market is considered in default once it has incurred the
// penalty rate, as determined by the grace tracker, for a continuous period of
// ninety days. `timeDelinquent` decrements while the market is healthy, so it
// can only exceed the grace period by this margin on an unbroken penalised run.
// Reads current state only: closeMarket() zeroes `timeDelinquent`, so a market
// that defaulted and was later closed is not counted.
export const TOU_DEFAULT_THRESHOLD_SECONDS = 90 * 24 * 60 * 60

export const isMarketInTouDefault = (market: Market): boolean =>
  !market.isClosed &&
  market.timeDelinquent - market.delinquencyGracePeriod >=
    TOU_DEFAULT_THRESHOLD_SECONDS

export const countMarketsInTouDefault = (
  markets: Market[] | undefined,
): number | undefined => markets?.filter(isMarketInTouDefault).length

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
