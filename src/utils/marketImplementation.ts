import { Market, MarketType, MarketVersion } from "@wildcatfi/wildcat-sdk"

import { COLORS } from "@/theme/colors"

type MarketImplementationSource = Pick<Market, "marketType" | "version">
export type MarketImplementationType = MarketType

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

export const getMarketImplementationConfig = (
  implementationType: MarketImplementationType,
) => {
  switch (implementationType) {
    case "revolving":
      return {
        label: "Revolving",
        backgroundColor: COLORS.glitter,
        color: COLORS.ultramarineBlue,
      }
    case "legacy":
    default:
      return {
        label: "Standard",
        backgroundColor: COLORS.blackHaze,
        color: COLORS.santasGrey,
      }
  }
}
