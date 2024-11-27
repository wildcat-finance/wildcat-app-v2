import { GridColDef } from "@mui/x-data-grid"
import { LenderWithdrawalStatus, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { LenderWithdrawalsForMarketResult } from "@/app/[locale]/lender/market/[address]/hooks/useGetLenderWithdrawals"

export type WithdrawalRequestsProps = {
  withdrawals: LenderWithdrawalsForMarketResult
}

export type TableProps = {
  withdrawals: LenderWithdrawalStatus[]
  totalAmount: TokenAmount
  columns?: GridColDef[]
}

export type WithdrawalTxRow = {
  id: string
  lender: string
  transactionId: string
  dateSubmitted: string
  amount: string
}
