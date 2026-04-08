import { Market, MarketType, MarketVersion } from "@wildcatfi/wildcat-sdk"

type MarketImplementationSource = Pick<Market, "marketType" | "version">

export const getMarketImplementationType = (
  market: MarketImplementationSource,
): MarketType => {
  // Existing deployed markets are all legacy. Until 2.5 lens/factory data is
  // available on a chain, V2 markets may not carry an explicit implementation.
  if (market.version === MarketVersion.V1) {
    return "legacy"
  }

  return market.marketType ?? "legacy"
}

export const isLegacyMarket = (market: MarketImplementationSource): boolean =>
  getMarketImplementationType(market) === "legacy"

export const isRevolvingMarket = (
  market: MarketImplementationSource,
): boolean => getMarketImplementationType(market) === "revolving"
