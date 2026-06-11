import { HooksKind, Market, MarketVersion } from "@wildcatfi/wildcat-sdk"

import { getPeriodicWindowTiming } from "@/utils/periodicWithdrawalWindow"

export const getMarketTypeChip = (market: Market) => {
  const kind =
    market.version === MarketVersion.V1
      ? HooksKind.OpenTerm
      : market.hooksKind ?? HooksKind.Unknown

  if (kind === HooksKind.FixedTerm && market.hooksConfig?.kind === kind) {
    const { hooksConfig } = market
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

  if (kind === HooksKind.PeriodicTerm && market.periodicHooksConfig) {
    const nowSec = Date.now() / 1000
    const timing = getPeriodicWindowTiming(market, nowSec)
    if (timing) {
      return {
        kind,
        periodicWindow: {
          isOpen: timing.isOpen,
          isTermClosed: timing.isTermClosed,
          msUntilBoundary:
            timing.isOpen && timing.currentWindowEnd !== undefined
              ? Math.max(0, (timing.currentWindowEnd - nowSec) * 1000)
              : Math.max(0, (timing.nextWindowStart - nowSec) * 1000),
        },
      }
    }
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
