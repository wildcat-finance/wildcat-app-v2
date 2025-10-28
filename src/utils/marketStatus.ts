import { Market } from "@wildcatfi/wildcat-sdk"
import { match } from "ts-pattern"

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
): MarketStatus =>
  match({ isClosed, isDelinquent, isIncurringPenalties })
    .with({ isClosed: true }, () => MarketStatus.TERMINATED)
    .with({ isIncurringPenalties: true }, () => MarketStatus.PENALTY)
    .with({ isDelinquent: true }, () => MarketStatus.DELINQUENT)
    .otherwise(() => MarketStatus.HEALTHY)

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
