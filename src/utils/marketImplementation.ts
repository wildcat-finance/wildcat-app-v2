import {
  DeployableMarketKind,
  Market,
  MarketKind,
  MarketVersion,
} from "@wildcatfi/wildcat-sdk"

import { COLORS } from "@/theme/colors"

type MarketImplementationSource = Pick<Market, "marketKind" | "version">
export type MarketImplementationType = MarketKind

export const marketImplementationOptions = [
  { id: "standard", label: "Standard", value: "standard" },
  { id: "revolving", label: "Revolving", value: "revolving" },
] satisfies Array<{
  id: DeployableMarketKind
  label: string
  value: DeployableMarketKind
}>

export const getMarketImplementationType = (
  market: MarketImplementationSource,
): MarketKind => {
  if (market.version === MarketVersion.V1) {
    return "standard"
  }

  return market.marketKind
}

export const isStandardMarket = (market: MarketImplementationSource): boolean =>
  getMarketImplementationType(market) === "standard"

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
    case "unknown":
      return {
        label: "Unknown",
        backgroundColor: COLORS.blackHaze,
        color: COLORS.santasGrey,
      }
    case "standard":
      return {
        label: "Standard",
        backgroundColor: COLORS.blackHaze,
        color: COLORS.santasGrey,
      }
    default:
      return {
        label: "Unknown",
        backgroundColor: COLORS.blackHaze,
        color: COLORS.santasGrey,
      }
  }
}
