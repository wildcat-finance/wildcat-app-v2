import { Market, MarketAccount } from "@wildcatfi/wildcat-sdk"

import { MasterLoanAgreementResponse } from "@/app/api/mla/interface"

export type MarketHeaderProps = {
  market: Market
  marketAccount?: MarketAccount
  mla?: MasterLoanAgreementResponse | undefined | null | { noMLA: boolean }
  hasMarketDescription?: boolean
}
