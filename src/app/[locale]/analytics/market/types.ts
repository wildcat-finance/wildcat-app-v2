// ============================================================
// Market Detail — Type definitions
// ============================================================

// --- Raw subgraph response shapes ---

export interface RawToken {
  symbol: string
  decimals: number
  address: string
}

export interface RawMarket {
  id: string
  name: string
  symbol: string
  decimals: number
  borrower: string
  asset: RawToken
  hooks: { kind: "OpenTerm" | "FixedTerm" | "Unknown" } | null
  hooksConfig: { fixedTermEndTime: number } | null
  annualInterestBips: number
  reserveRatioBips: number
  delinquencyGracePeriod: number
  delinquencyFeeBips: number
  withdrawalBatchDuration: number
  maxTotalSupply: string
  scaledTotalSupply: string
  scaleFactor: string
  isDelinquent: boolean
  isIncurringPenalties: boolean
  isClosed: boolean
  timeDelinquent: number
  protocolFeeBips: number
  totalBorrowed: string
  totalRepaid: string
  totalDeposited: string
  totalBaseInterestAccrued: string
  totalDelinquencyFeesAccrued: string
  totalProtocolFeesAccrued: string
  pendingProtocolFees: string
  normalizedUnclaimedWithdrawals: string
  createdAt: number
}

export interface RawMarketDailyStats {
  startTimestamp: number
  totalDeposited: string
  totalWithdrawalsRequested: string
  totalWithdrawalsExecuted: string
  totalBorrowed: string
  totalRepaid: string
  totalDebt?: string
}

export interface RawLenderAccount {
  address: string
  scaledBalance: string
  totalDeposited: string
  totalInterestEarned: string
  addedTimestamp: number
}

export interface RawWithdrawalBatch {
  id: string
  expiry: string
  scaledTotalAmount: string
  scaledAmountBurned: string
  normalizedAmountPaid: string
  totalNormalizedRequests: string
  isExpired: boolean
  isClosed: boolean
  lenderWithdrawalsCount: number
  creation: { blockTimestamp: number }
  expiration: {
    normalizedAmountPaid: string
    normalizedAmountOwed: string
    blockTimestamp: number
  } | null
}

export interface RawDelinquencyEvent {
  isDelinquent: boolean
  blockTimestamp: number
  liquidityCoverageRequired: string
  totalAssets: string
}

export interface RawMarketInterestAccrued {
  fromTimestamp: number
  toTimestamp: number
  baseInterestAccrued: string
  delinquencyFeesAccrued: string
  protocolFeesAccrued: string
  blockTimestamp: number
}

export interface RawTransfer {
  from: { address: string }
  to: { address: string }
  amount: string
  blockTimestamp: number
  transactionHash: string
}

export interface RawParameterChanges {
  annualInterestBipsUpdateds: {
    oldAnnualInterestBips: number
    newAnnualInterestBips: number
    blockTimestamp: number
    transactionHash: string
  }[]
  reserveRatioBipsUpdateds: {
    oldReserveRatioBips: number
    newReserveRatioBips: number
    blockTimestamp: number
    transactionHash: string
  }[]
  maxTotalSupplyUpdateds: {
    oldMaxTotalSupply: string
    newMaxTotalSupply: string
    blockTimestamp: number
    transactionHash: string
  }[]
  fixedTermUpdateds: {
    oldFixedTermEndTime: number
    newFixedTermEndTime: number
    blockTimestamp: number
    transactionHash: string
  }[]
  minimumDepositUpdateds: {
    oldMinimumDeposit: string | null
    newMinimumDeposit: string
    blockTimestamp: number
    transactionHash: string
  }[]
}

// --- Component data shapes ---

export interface MarketInfo {
  address: string
  name: string
  borrower: string
  assetSymbol: string
  assetDecimals: number
  marketType: "Open-term" | "Fixed-term" | "Unknown"
  fixedTermEndTime: number | null
  status: "Healthy" | "Delinquent" | "Penalty" | "Closed"
  createdAt: Date
  currentAPR: number
  reserveRatioTarget: number
  reserveRatioActual: number
  penaltyAPR: number
  gracePeriodHours: number
  gracePeriodSeconds: number
  withdrawalCycleHours: number
  protocolFeePct: number
  totalDebt: number
  capacity: number
  utilizationPct: number
  activeLenders: number
  avgDeposit: number
  totalBorrowed: number
  totalRepaid: number
  totalDeposited: number
  totalBaseInterest: number
  totalDelinquencyFees: number
  totalProtocolFees: number
  scaleFactor: string
}

export interface DailyDataPoint {
  date: string
  dateShort: string
  timestamp: number
  debt: number
  dailyDeposit: number
  dailyWithdrawal: number
  dailyWithdrawalNeg: number
  netFlow: number
  baseInterest: number
  delinquencyFees: number
  protocolFees: number
}

export interface WithdrawalBatchData {
  id: string
  label: string
  requested: number
  paidAtExpiry: number
  shortfall: number
  status: "paid" | "paid-late" | "unpaid" | "pending"
  daysToClose: number | null
  lenderCount: number
}

export interface DelinquencyEvent {
  id: number
  start: string
  end: string | null
  durationHours: number
  penalized: boolean
}

export interface ParameterChange {
  date: string
  timestamp: number
  parameter: string
  oldValue: string
  newValue: string
  tx: string
}

export interface LenderData {
  address: string
  firstDeposit: string
  totalDeposited: number
  balance: number
  interest: number
  pctOfMarket: number
}

export interface TransferData {
  date: string
  from: string
  to: string
  amount: number
  tx: string
}

export interface WithdrawalQueueData {
  pendingBatches: number
  totalQueued: number
  amountUnfilled: number
  lendersWaiting: number
  nextExpiry: string
}

export interface WithdrawalHistoricalStats {
  totalBatches: number
  fullyPaidPct: number
  paidLateCount: number
  unpaidCount: number
  avgShortfallPct: number
}

export interface BatchResults {
  batches: WithdrawalBatchData[]
  queue: WithdrawalQueueData
  stats: WithdrawalHistoricalStats
}
