import { Market, TokenWrapper } from "@wildcatfi/wildcat-sdk"

export type AdditionalParameterItem = {
  title: string
  value: string | number
  tooltipText?: string
}

export type MarketParametersProps = {
  market: Market

  viewerType: "lender" | "borrower"
  hasWrapper?: boolean
  wrapper?: TokenWrapper | undefined
  additionalItems?: AdditionalParameterItem[]
}
