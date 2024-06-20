import { Market } from "@wildcatfi/wildcat-sdk"

import { BorrowerWithdrawalsForMarketResult } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"

export type CollateralObligationsDataProps = {
  market: Market
  withdrawals: BorrowerWithdrawalsForMarketResult
  doubleDivider?: boolean
}
