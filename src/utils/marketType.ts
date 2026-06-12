import {
  HooksKind,
  Market,
  MarketVersion,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"

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
    const config = market.periodicHooksConfig
    if (config.periodDuration) {
      // Pass the raw schedule so the chip can tick its own countdown and flip
      // open/closed live across window boundaries.
      return {
        kind,
        periodicWindow: {
          isTermClosed: config.periodicTermClosed || market.isClosed,
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

// temporary: tolerate periodic market data without exposing periodic ux outside sepolia.
export const isFrontendVisibleMarket = (market: Market) =>
  market.chainId === SupportedChainId.Sepolia ||
  market.version !== MarketVersion.V2 ||
  (market.hooksKind !== HooksKind.PeriodicTerm &&
    market.hooksConfig?.kind !== HooksKind.PeriodicTerm)
