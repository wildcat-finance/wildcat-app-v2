import {
  getMarketImplementationType,
  MarketImplementationType,
} from "@/utils/marketImplementation"

import {
  MarketImplementationVariant,
  MarketImplementationVariantKey,
} from "./interface"
import { standardMarketImplementationVariant } from "./legacy"
import { revolvingMarketImplementationVariant } from "./revolving"

const MARKET_IMPLEMENTATION_VARIANTS: Record<
  MarketImplementationVariantKey,
  MarketImplementationVariant
> = {
  standard: standardMarketImplementationVariant,
  revolving: revolvingMarketImplementationVariant,
  unknown: {
    ...standardMarketImplementationVariant,
    key: "unknown",
  },
}

export const getMarketImplementationVariantForType = (
  implementationType: MarketImplementationType,
): MarketImplementationVariant =>
  MARKET_IMPLEMENTATION_VARIANTS[implementationType] ??
  MARKET_IMPLEMENTATION_VARIANTS.unknown

export const getMarketImplementationVariant = (
  market: Parameters<typeof getMarketImplementationType>[0],
): MarketImplementationVariant =>
  getMarketImplementationVariantForType(getMarketImplementationType(market))
