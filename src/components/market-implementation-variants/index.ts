import {
  getMarketImplementationType,
  MarketImplementationType,
} from "@/utils/marketImplementation"

import {
  MarketImplementationVariant,
  MarketImplementationVariantKey,
} from "./interface"
import { legacyMarketImplementationVariant } from "./legacy"
import { revolvingMarketImplementationVariant } from "./revolving"

const MARKET_IMPLEMENTATION_VARIANTS: Record<
  MarketImplementationVariantKey,
  MarketImplementationVariant
> = {
  legacy: legacyMarketImplementationVariant,
  revolving: revolvingMarketImplementationVariant,
}

export const getMarketImplementationVariantForType = (
  implementationType: MarketImplementationType,
): MarketImplementationVariant =>
  MARKET_IMPLEMENTATION_VARIANTS[implementationType] ??
  MARKET_IMPLEMENTATION_VARIANTS.legacy

export const getMarketImplementationVariant = (
  market: Parameters<typeof getMarketImplementationType>[0],
): MarketImplementationVariant =>
  getMarketImplementationVariantForType(getMarketImplementationType(market))
