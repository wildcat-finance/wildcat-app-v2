export interface PollingRegistrationProps {
  address?: string
}

export type TBorrowerRegistrationChange = {
  isRegistered: boolean
  blockTimestamp: number
  transactionHash: string
}

export type TReserveRatioBipsUpdated = {
  newReserveRatioBips: number
  oldReserveRatioBips: number
  blockTimestamp: number
  transactionHash: string
  market: {
    name: string
    symbol: string
  }
}

export type TAuthorizationChange = {
  lender: string
  authorized: boolean
  blockTimestamp: number
  authorization: {
    marketAccounts: {
      market: { name: string; id: string }
    }[]
  }
}

export type TLenderAuthorizationChange = {
  borrower: string
  authorized: boolean
  blockTimestamp: number
  authorization: {
    marketAccounts: {
      market: { name: string; id: string }
    }[]
  }
}

export type TBorrow = {
  assetAmount: bigint
  blockTimestamp: number
  market: {
    name: string
    symbol: string
    decimals: number
  }
  transactionHash: string
}

export type TDebtRepaid = {
  assetAmount: bigint
  blockTimestamp: number
  market: {
    name: string
    symbol: string
    decimals: number
  }
  transactionHash: string
}

export type TWithdrawalBatchCreated = {
  batch: {
    expiry: number
    market: {
      id: string
      name: string
      symbol: string
      decimals: number
    }
  }
  blockTimestamp: number
  transactionHash: string
}

export type TWithdrawalExecution = {
  batch: {
    market: {
      id: string
      name: string
      symbol: string
      decimals: number
    }
  }
  blockTimestamp: number
  normalizedAmount: bigint
  transactionHash: string
}

export type TWithdrawalBatchExpired = {
  batch: {
    market: {
      id: string
      name: string
      symbol: string
      decimals: number
    }
  }
  blockTimestamp: number
  scaledAmountBurned: bigint
  scaledTotalAmount: bigint
  normalizedAmountOwed: bigint
  transactionHash: string
}

export type TMarketTerminated = {
  blockTimestamp: number
  transactionHash: string
  market: {
    name: string
  }
}
