import {
  FixedTermHooksConfig,
  HooksKind,
  Market,
  MarketVersion,
} from "@wildcatfi/wildcat-sdk"

export const getMarketTypeChip = (market: Market) => {
  const kind =
    market.version === MarketVersion.V1 ? HooksKind.OpenTerm : market.hooksKind!

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
