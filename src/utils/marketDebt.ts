import { Market, TokenAmount } from "@wildcatfi/wildcat-sdk"

export type MarketTotalDebtFields = Pick<
  Market,
  "totalSupply" | "underlyingToken"
>

// Unfunded withdrawals remain in supply until paid; funded claims and protocol
// fees are separate liabilities. Use the underlying token for display units.
export const getMarketTotalDebt = (
  market: MarketTotalDebtFields,
): TokenAmount => market.underlyingToken.getAmount(market.totalSupply.raw)
