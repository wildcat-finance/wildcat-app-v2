export type MarketLiveDataStatus = "loading" | "ready" | "unavailable"

export const getMarketLiveDataStatus = ({
  hasLiveData,
  hasError,
}: {
  hasLiveData: boolean
  hasError: boolean
}): MarketLiveDataStatus => {
  if (hasLiveData) return "ready"
  if (hasError) return "unavailable"
  return "loading"
}
