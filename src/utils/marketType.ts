import { FixedTermHooksConfig, HooksKind, Market } from "@wildcatfi/wildcat-sdk"

import { isFixedTermMarket } from "@/utils/marketCapabilities"

export const getMarketTypeChip = (market: Market) => {
  const kind = isFixedTermMarket(market)
    ? HooksKind.FixedTerm
    : HooksKind.OpenTerm

  if (kind === HooksKind.FixedTerm) {
    const hooksConfig = market.hooksConfig as FixedTermHooksConfig
    const fixedTermEndTime = hooksConfig.fixedTermEndTime * 1000
    return {
      kind,
      fixedPeriod: fixedTermEndTime - Date.now(),
    }
    /*  if (fixedTermEndTime > Date.now()) {
      return {
        kind,
        fixedPeriod: fixedTermEndTime - Date.now(),
      }
    }
    // If market is in fixed term but the fixed term has ended, we show the market as open term
    return {
      kind: HooksKind.OpenTerm,
    } */
  }
  return {
    kind,
  }
}

// temporary: tolerate periodic market data without exposing periodic ux.
export const isFrontendVisibleMarket = (market: Market) =>
  market.version !== MarketVersion.V2 ||
  (market.hooksKind !== HooksKind.PeriodicTerm &&
    market.hooksConfig?.kind !== HooksKind.PeriodicTerm)
