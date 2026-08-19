import { HooksKind, Market, MarketVersion } from "@wildcatfi/wildcat-sdk"

import { isFixedTermMarket } from "@/utils/marketCapabilities"

export const getMarketTypeChip = (market: Market) => {
  const kind = (() => {
    if (market.version === MarketVersion.V1) return HooksKind.OpenTerm
    if (
      market.periodicHooksConfig ||
      market.hooksKind === HooksKind.PeriodicTerm ||
      market.hooksConfig?.kind === HooksKind.PeriodicTerm
    ) {
      return HooksKind.PeriodicTerm
    }
    if (isFixedTermMarket(market)) return HooksKind.FixedTerm
    return market.hooksKind ?? market.hooksConfig?.kind ?? HooksKind.OpenTerm
  })()

  if (kind === HooksKind.FixedTerm && market.hooksConfig?.kind === kind) {
    const { hooksConfig } = market
    const fixedTermEndTime = hooksConfig.fixedTermEndTime * 1000
    return {
      kind,
      fixedPeriod: fixedTermEndTime - Date.now(),
      // Carried alongside `fixedPeriod` so the chip can render the maturity in
      // UTC. Deriving the date from `now + fixedPeriod` renders it in the
      // viewer's local time, which disagrees with every other maturity display.
      fixedTermEndTime: hooksConfig.fixedTermEndTime,
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
    const config = market.periodicHooksConfig
    if (config.periodDuration) {
      // Pass the raw schedule so the chip can tick its own countdown and flip
      // open/closed live across window boundaries.
      return {
        kind,
        periodicWindow: {
          isTermClosed: Boolean(config.periodicTermClosed || market.isClosed),
          firstWithdrawalWindowStart: config.firstWithdrawalWindowStart,
          periodDuration: config.periodDuration,
          withdrawalWindowDuration: config.withdrawalWindowDuration,
        },
      }
    }
  }

  return {
    kind,
  }
}
