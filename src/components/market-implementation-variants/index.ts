import { Market } from "@wildcatfi/wildcat-sdk"

import { isRevolvingAprMarket } from "@/utils/marketApr"
import {
  getMarketImplementationType,
  MarketImplementationType,
} from "@/utils/marketImplementation"

import {
  MarketAprCopy,
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

/**
 * APR wording for a market.
 *
 * Resolved from `isRevolvingAprMarket` rather than from the implementation
 * variant alone so the wording is driven by the same reading of the market that
 * produces the APR numbers. A revolving market whose `marketKind` did not
 * survive the read still gets utilization wording instead of silently falling
 * back to the standard variant and calling its utilization APR a base APR.
 */
export const getMarketAprCopy = (market: Market): MarketAprCopy =>
  (isRevolvingAprMarket(market)
    ? MARKET_IMPLEMENTATION_VARIANTS.revolving
    : getMarketImplementationVariant(market)
  ).aprCopy
