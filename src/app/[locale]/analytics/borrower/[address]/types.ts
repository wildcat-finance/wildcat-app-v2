// ============================================================
// Borrower Profile — Type definitions
// ============================================================

// --- Raw subgraph response shapes ---

export interface RawBorrowerMarket {
  id: string
  name: string
  asset: { symbol: string; decimals: number; address: string }
  hooks: { kind: "OpenTerm" | "FixedTerm" | "Unknown" } | null
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
  totalBorrowed: string
  totalRepaid: string
  totalDeposited: string
  totalBaseInterestAccrued: string
  totalDelinquencyFeesAccrued: string
  totalProtocolFeesAccrued: string
  createdAt: number
}

export interface RawMarketDailyStats {
  market: {
    id: string
    asset: { decimals: number; address: string; isUsdStablecoin: boolean }
  }
  startTimestamp: number
  scaledTotalSupply: string
  scaleFactor: string
  usdPrice: string | null
}

export interface RawDelinquencyEvent {
  market: { id: string }
  isDelinquent: boolean
  blockTimestamp: number
}

export interface RawWithdrawalBatch {
  market: { id: string }
  id: string
  expiry: string
  totalNormalizedRequests: string
  normalizedAmountPaid: string
  isExpired: boolean
  isClosed: boolean
  lenderWithdrawalsCount: number
  expiration: {
    normalizedAmountPaid: string
    normalizedAmountOwed: string
    blockTimestamp: number
  } | null
}

export interface RawMarketInterestAccrued {
  market: { id: string; asset: { decimals: number; address: string } }
  baseInterestAccrued: string
  delinquencyFeesAccrued: string
  protocolFeesAccrued: string
  blockTimestamp: number
}

export interface RawLenderAccount {
  address: string
  market: {
    id: string
    name: string
    asset: { decimals: number }
    scaleFactor: string
  }
  scaledBalance: string
  totalDeposited: string
  totalInterestEarned: string
}

export interface RawParameterChanges {
  annualInterestBipsUpdateds: {
    market: { id: string }
    oldAnnualInterestBips: number
    newAnnualInterestBips: number
    blockTimestamp: number
    transactionHash: string
  }[]
  reserveRatioBipsUpdateds: {
    market: { id: string }
    oldReserveRatioBips: number
    newReserveRatioBips: number
    blockTimestamp: number
    transactionHash: string
  }[]
  maxTotalSupplyUpdateds: {
    market: { id: string }
    oldMaxTotalSupply: string
    newMaxTotalSupply: string
    blockTimestamp: number
    transactionHash: string
  }[]
  fixedTermUpdateds: {
    market: { id: string }
    oldFixedTermEndTime: number
    newFixedTermEndTime: number
    blockTimestamp: number
    transactionHash: string
  }[]
  minimumDepositUpdateds: {
    market: { id: string }
    oldMinimumDeposit: string | null
    newMinimumDeposit: string
    blockTimestamp: number
    transactionHash: string
  }[]
}

// --- Component data shapes ---

export interface BorrowerProfile {
  address: string
  firstMarketCreated: string
  timeOnProtocol: string
  activeMarkets: number
  closedMarkets: number
  assetsUsed: string[]
  totalDebt: number
  totalCapacity: number
  avgUtilization: number
  avgAPR: number
  totalBorrowed: number
  totalRepaid: number
}

export interface BorrowerMarketRow {
  id: string
  name: string
  asset: string
  assetAddress: string
  decimals: number
  marketType: string
  totalDebt: number
  capacity: number
  apr: number
  utilization: number
  status: "Healthy" | "Delinquent" | "Penalty" | "Closed"
  created: string
  scaleFactor: string
  gracePeriodSec: number
}

export interface AggDebtPoint {
  date: string
  dateShort: string
  timestamp: number
  [marketId: string]: string | number
}

export interface BorrowerDelinquencyEvent {
  marketId: string
  marketName: string
  id: number
  start: string
  startTs: number
  end: string | null
  endTs: number | null
  durationHours: number
  penalized: boolean
}

export interface BorrowerBatchResults {
  totalExpired: number
  fullyPaidPct: number
  paidLateCount: number
  unpaidCount: number
  avgShortfallPct: number
  pendingBatches: number
  totalQueued: number
  nextExpiry: string
  batches: {
    marketName: string
    label: string
    requested: number
    paidAtExpiry: number
    shortfall: number
    status: "paid" | "paid-late" | "unpaid" | "pending"
  }[]
}

export interface BorrowerInterestSummary {
  totalCost: number
  totalBaseInterest: number
  totalDelinquencyFees: number
  totalProtocolFees: number
  annualizedCost: string
  penaltyRatio: string
  points: {
    date: string
    dateShort: string
    timestamp: number
    baseInterest: number
    delinquencyFees: number
    protocolFees: number
  }[]
}

export interface BorrowerParameterChange {
  date: string
  timestamp: number
  market: string
  parameter: string
  oldValue: string
  newValue: string
  tx: string
}

export interface LenderOverlapEntry {
  address: string
  marketCount: number
  markets: string[]
  totalDeposited: number
  currentBalance: number
  interestEarned: number
  pctOfDebt: number
}
