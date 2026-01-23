import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { MasterLoanAgreementResponse } from "@/app/api/mla/interface"

export type MarketHeaderProps = {
  marketAccount: MarketAccount
  mla?: MasterLoanAgreementResponse | undefined | null | { noMLA: boolean }
  hasMarketDescription?: boolean
}
