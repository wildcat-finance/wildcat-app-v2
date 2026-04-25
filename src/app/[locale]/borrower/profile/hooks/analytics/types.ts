export type BorrowerProfileAnalytics = {
  address: string
  firstMarketCreated: string
  timeOnProtocol: string
  activeMarkets: number
  closedMarkets: number
  assetsUsed: string[]
  totalDebt: number
  totalCapacity: number
  avgApr: number
  totalBorrowed: number
  totalRepaid: number
  marketIds: string[]
  nameMap: Record<string, string>
  gracePeriodMap: Record<string, number>
  priceMap: Record<string, number>
  decimalsMap: Record<string, number>
}

export type BorrowerInterestCostPoint = {
  date: string
  dateShort: string
  timestamp: number
  dayBaseInterest: number
  dayDelinquencyFees: number
  dayProtocolFees: number
  baseInterest: number
  delinquencyFees: number
  protocolFees: number
  totalCost: number
}

export type BorrowerCureVelocityPoint = {
  id: string
  marketId: string
  marketName: string
  startTimestamp: number
  endTimestamp: number
  severityUsd: number
  cureHours: number
  delinquencyFeesUsd: number
  penalized: boolean
}

export type BorrowerCureVelocityData = {
  points: BorrowerCureVelocityPoint[]
  protocolMedianCureHours: number | null
}

export type BorrowerCapitalCostPoint = {
  date: string
  dateShort: string
  timestamp: number
  baseInterest: number
  delinquencyFees: number
  protocolFees: number
  statedApr: number
  effectiveApr: number
  totalDebtUsd: number
}

export type BorrowerAggregateDebtPoint = {
  date: string
  dateShort: string
  timestamp: number
  totalDebtUsd: number
} & Record<string, string | number>

export type BorrowerDelinquencyEvent = {
  id: number
  marketId: string
  marketName: string
  startTimestamp: number
  endTimestamp: number | null
  durationHours: number
  penalized: boolean
}

export type BorrowerWithdrawalBatchSummary = {
  id: string
  marketName: string
  label: string
  expiryTimestamp: number
  requested: number
  paid: number
  paidLate: number
  unpaid: number
  shortfall: number
  status: "paid" | "paid-late" | "unpaid" | "pending"
}

export type BorrowerWithdrawalAnalytics = {
  totalExpired: number
  fullyPaidPct: number
  paidLateCount: number
  unpaidCount: number
  avgShortfallPct: number
  pendingBatches: number
  totalQueued: number
  nextExpiry: string
  batches: BorrowerWithdrawalBatchSummary[]
}
