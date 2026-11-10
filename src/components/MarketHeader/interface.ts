import { Market } from "@wildcatfi/wildcat-sdk"

import { MasterLoanAgreementResponse } from "@/app/api/mla/interface"

export type MarketHeaderProps = {
  market: Market
  isLiveMarketReady?: boolean
  mla?: MasterLoanAgreementResponse | undefined | null | { noMLA: boolean }
  hasMarketDescription?: boolean
  variant?: "lender" | "borrower"
}
