export type LenderProfileAnalytics = {
  address: string
  firstDeposit: string
  timeOnProtocol: string
  activePositions: number
  totalPositions: number
  assetsUsed: string[]
  totalBalance: number
  totalDeposited: number
  totalInterestEarned: number
  effectiveYield: number
}

export type LenderPositionRow = {
  id: string
  marketId: string
  marketName: string
  borrower: string
  asset: string
  currentBalance: number
  totalDeposited: number
  interestEarned: number
  apr: number
  utilization: number
  status: "Active" | "Delinquent" | "Penalty" | "Closed"
  addedDate: string
}

export type LenderPositionsData = {
  profile: LenderProfileAnalytics
  positions: LenderPositionRow[]
  marketIds: string[]
  decimalsMap: Record<string, number>
  priceMap: Record<string, number>
}

export type LenderActivityRow = {
  id: string
  date: string
  timestamp: number
  market: string
  marketId: string
  type: "Deposit" | "Withdrawal Request" | "Withdrawal Execution"
  amountUsd: number
  txHash: string
}

export type LenderCashFlowPoint = {
  date: string
  dateShort: string
  timestamp: number
  cumDeposits: number
  cumWithdrawals: number
  netFlow: number
}

export type LenderActivityData = {
  activity: LenderActivityRow[]
  cashFlow: LenderCashFlowPoint[]
}

export type LenderBatchRow = {
  id: string
  marketId: string
  marketName: string
  requested: number
  withdrawn: number
  remaining: number
  isCompleted: boolean
  isClosed: boolean
  isExpired: boolean
  expiry: string
}
