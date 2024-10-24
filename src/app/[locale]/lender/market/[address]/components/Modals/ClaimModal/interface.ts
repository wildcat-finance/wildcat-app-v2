import { Market } from "@wildcatfi/wildcat-sdk"

import { LenderWithdrawalsForMarketResult } from "@/app/[locale]/lender/market/[address]/hooks/useGetLenderWithdrawals"

export type ClaimModalProps = {
  market: Market
  withdrawals: LenderWithdrawalsForMarketResult
}
