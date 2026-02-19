import { Market, TokenWrapper } from "@wildcatfi/wildcat-sdk"

export type MarketParametersProps = {
  market: Market

  viewerType: "lender" | "borrower"
  hasWrapper?: boolean
  wrapper?: TokenWrapper | undefined
}
