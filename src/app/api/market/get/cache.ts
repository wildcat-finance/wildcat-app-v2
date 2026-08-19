// Bump when fields required to construct an SDK Market change.
export const MARKET_CACHE_PAYLOAD_VERSION = "2"

type MarketLookupResult<T> = {
  chainId: number
  market: T
} | null

export const isCompatibleMarketPayload = (market: unknown): boolean => {
  if (!market || typeof market !== "object") return false

  const { totalAssets } = market as { totalAssets?: unknown }
  return typeof totalAssets === "string" && /^\d+$/.test(totalAssets)
}

export const recoverIncompatibleMarketPayload = async <T>(
  cached: MarketLookupResult<T>,
  fetchFresh: () => Promise<MarketLookupResult<T>>,
): Promise<MarketLookupResult<T>> => {
  if (!cached || isCompatibleMarketPayload(cached.market)) return cached

  const fresh = await fetchFresh()
  if (fresh && !isCompatibleMarketPayload(fresh.market)) {
    throw new Error("Market payload is missing required fields")
  }

  return fresh
}
