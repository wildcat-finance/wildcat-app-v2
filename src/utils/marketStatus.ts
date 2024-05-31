export enum MarketStatus {
  HEALTHY = "Healthy",
  DELINQUENT = "Delinquent",
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
