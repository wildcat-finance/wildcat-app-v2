import { Market } from "@wildcatfi/wildcat-sdk"

import { getDelinquencyProjection } from "@/utils/delinquency"
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

export const getMarketStatusChip = (market: Market) => {
  const { projectedTimeDelinquent, isIncurringPenalties } =
    getDelinquencyProjection(market)

  const delinquencyPeriod =
    projectedTimeDelinquent > market.delinquencyGracePeriod
      ? 0
      : market.delinquencyGracePeriod - projectedTimeDelinquent
  const penaltyPeriod = Math.max(
    0,
    projectedTimeDelinquent - market.delinquencyGracePeriod,
  )

  return {
    status: getMarketStatus(
      market.isClosed,
      market.isDelinquent || market.willBeDelinquent,
      isIncurringPenalties,
    ),
    healthyPeriod:
      market.totalDebts.gt(0) &&
      market.effectiveBorrowerAPR.gt(0) &&
      market.reserveRatioBips !== 0
        ? market.secondsBeforeDelinquency * 1000
        : null,
    penaltyPeriod: secondsToDays(penaltyPeriod),
    delinquencyPeriod: secondsToDays(delinquencyPeriod),
  }
}
