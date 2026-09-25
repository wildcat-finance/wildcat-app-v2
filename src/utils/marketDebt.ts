import { Market, TokenAmount } from "@wildcatfi/wildcat-sdk"

export type MarketTotalDebtFields = Pick<
  Market,
  "totalSupply" | "underlyingToken"
>

export const getMarketTotalDebt = (
  market: MarketTotalDebtFields,
): TokenAmount => market.underlyingToken.getAmount(market.totalSupply.raw)
