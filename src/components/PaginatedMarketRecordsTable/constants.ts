import { MarketRecordKind } from "@wildcatfi/wildcat-sdk"

export type MarketRecordFilterOption = {
  id: string
  value: MarketRecordKind
  label: string
}

export const MARKET_RECORD_FILTERS: MarketRecordFilterOption[] = (
  [
    ["AnnualInterestBipsUpdated", "APR Change"],
    ["Borrow", "Borrow"],
    ["DebtRepaid", "Repayment"],
    ["DelinquencyStatusChanged", "Delinquency"],
    ["Deposit", "Deposit"],
    ["FeesCollected", "Fees"],
    ["FixedTermUpdated", "Fixed Term"],
    ["MarketClosed", "Market Closed"],
    ["MaxTotalSupplyUpdated", "Capacity Change"],
    ["MinimumDepositUpdated", "Minimum Deposit Updated"],
    ["ProtocolFeeBipsUpdated", "Protocol Fee Change"],
    ["WithdrawalRequest", "Withdrawal"],
  ] as [MarketRecordKind, string][]
).map(([value, label]) => ({ id: `check-filter-${value}`, value, label }))

export const ALL_MARKET_RECORD_KINDS: MarketRecordKind[] =
  MARKET_RECORD_FILTERS.map((f) => f.value)

export const DEFAULT_MARKET_RECORDS_PAGE = 0
export const DEFAULT_MARKET_RECORDS_PAGE_SIZE = 10
export const MARKET_RECORDS_RECENT_WINDOW_LIMIT = 100
