import { Market, TokenWrapper } from "@wildcatfi/wildcat-sdk"

export type MarketParametersProps = {
  market: Market

  hasWrapper: boolean
  wrapper: TokenWrapper | undefined
}
