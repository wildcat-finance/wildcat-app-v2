import { gql, TypedDocumentNode } from "@apollo/client"

type LenderAccountDto = {
  address: string
}

type WithdrawalRequestDto = {
  id: string
  eventIndex: number
  requestIndex: number
  account: LenderAccountDto
  scaledAmount: string
  normalizedAmount: string
  blockNumber: number
  blockTimestamp: number
  transactionHash: string
}

type WithdrawalExecutionDto = {
  id: string
  account: LenderAccountDto
  normalizedAmount: string
  blockNumber: number
  blockTimestamp: number
  transactionHash: string
}

type WithdrawalBatchPaymentDto = {
  id: string
  scaledAmountBurned: string
  normalizedAmountPaid: string
  blockNumber: number
  blockTimestamp: number
  transactionHash: string
}

type LenderWithdrawalStatusDto = {
  id: string
  account: LenderAccountDto
  requestsCount: number
  executionsCount: number
  scaledAmount: string
  normalizedAmountWithdrawn: string
  totalNormalizedRequests: string
  isCompleted: boolean
}

type WithdrawalBatchDto = {
  id: string
  expiry: string
  scaledTotalAmount: string
  scaledAmountBurned: string
  normalizedAmountPaid: string
  normalizedAmountClaimed: string
  totalNormalizedRequests: string
  isExpired: boolean
  isClosed: boolean
  isCompleted: boolean
  paymentsCount: number
  lastScaleFactor: string
  lastUpdatedTimestamp: number
  totalInterestEarned: string
  creation: {
    blockNumber: number
    blockTimestamp: number
    transactionHash: string
  }
  payments: WithdrawalBatchPaymentDto[]
}

export type WithdrawalBatchWithEventsDto = WithdrawalBatchDto & {
  withdrawals: LenderWithdrawalStatusDto[]
  requests: WithdrawalRequestDto[]
  executions: WithdrawalExecutionDto[]
}

export type LenderWithdrawalWithEventsDto = LenderWithdrawalStatusDto & {
  batch: WithdrawalBatchDto
  requests: WithdrawalRequestDto[]
  executions: WithdrawalExecutionDto[]
}

type IncompleteWithdrawalsForMarketData = {
  market: {
    withdrawalBatches: WithdrawalBatchWithEventsDto[]
  } | null
}

type IncompleteWithdrawalsForMarketVariables = {
  market: string
}

type LenderWithdrawalsForMarketData = {
  market: {
    lenders: Array<{
      incompleteWithdrawals: LenderWithdrawalWithEventsDto[]
      completeWithdrawals: LenderWithdrawalWithEventsDto[]
    }>
  } | null
}

type LenderWithdrawalsForMarketVariables = {
  market: string
  lender: string
}

// Temporary app-owned escape hatches: SDK 3.1.8 does not expose the complete
// batch/request history required by the borrower and lender withdrawal views.
// The returned indexed history is hydrated through the live lens before use.
export const GET_INCOMPLETE_WITHDRAWALS_FOR_MARKET = gql`
  fragment AppWithdrawalBatchPayment on WithdrawalBatchPayment {
    id
    scaledAmountBurned
    normalizedAmountPaid
    blockNumber
    blockTimestamp
    transactionHash
  }

  fragment AppWithdrawalRequest on WithdrawalRequest {
    id
    eventIndex
    requestIndex
    account {
      address
    }
    scaledAmount
    normalizedAmount
    blockNumber
    blockTimestamp
    transactionHash
  }

  fragment AppWithdrawalExecution on WithdrawalExecution {
    id
    account {
      address
    }
    normalizedAmount
    blockNumber
    blockTimestamp
    transactionHash
  }

  fragment AppLenderWithdrawalStatus on LenderWithdrawalStatus {
    id
    account {
      address
    }
    requestsCount
    executionsCount
    scaledAmount
    normalizedAmountWithdrawn
    totalNormalizedRequests
    isCompleted
  }

  fragment AppWithdrawalBatch on WithdrawalBatch {
    id
    expiry
    scaledTotalAmount
    scaledAmountBurned
    normalizedAmountPaid
    normalizedAmountClaimed
    totalNormalizedRequests
    isExpired
    isClosed
    isCompleted
    paymentsCount
    lastScaleFactor
    lastUpdatedTimestamp
    totalInterestEarned
    creation {
      blockNumber
      blockTimestamp
      transactionHash
    }
    payments {
      ...AppWithdrawalBatchPayment
    }
  }

  fragment AppWithdrawalBatchWithEvents on WithdrawalBatch {
    ...AppWithdrawalBatch
    withdrawals {
      ...AppLenderWithdrawalStatus
    }
    requests {
      ...AppWithdrawalRequest
    }
    executions {
      ...AppWithdrawalExecution
    }
  }

  query AppIncompleteWithdrawalsForMarket($market: ID!) {
    market(id: $market) {
      withdrawalBatches(
        first: 100
        orderBy: expiry
        orderDirection: desc
        where: { isCompleted: false }
      ) {
        ...AppWithdrawalBatchWithEvents
      }
    }
  }
` as TypedDocumentNode<
  IncompleteWithdrawalsForMarketData,
  IncompleteWithdrawalsForMarketVariables
>

export const GET_LENDER_WITHDRAWALS_FOR_MARKET = gql`
  fragment LenderViewWithdrawalStatus on LenderWithdrawalStatus {
    id
    account {
      address
    }
    requestsCount
    executionsCount
    scaledAmount
    normalizedAmountWithdrawn
    totalNormalizedRequests
    isCompleted
  }

  fragment LenderViewWithdrawalBatchPayment on WithdrawalBatchPayment {
    id
    scaledAmountBurned
    normalizedAmountPaid
    blockNumber
    blockTimestamp
    transactionHash
  }

  fragment LenderViewWithdrawalBatch on WithdrawalBatch {
    id
    expiry
    scaledTotalAmount
    scaledAmountBurned
    normalizedAmountPaid
    normalizedAmountClaimed
    totalNormalizedRequests
    isExpired
    isClosed
    isCompleted
    paymentsCount
    lastScaleFactor
    lastUpdatedTimestamp
    totalInterestEarned
    creation {
      blockNumber
      blockTimestamp
      transactionHash
    }
    payments {
      ...LenderViewWithdrawalBatchPayment
    }
  }

  fragment LenderViewWithdrawalRequest on WithdrawalRequest {
    id
    eventIndex
    requestIndex
    account {
      address
    }
    scaledAmount
    normalizedAmount
    blockNumber
    blockTimestamp
    transactionHash
  }

  fragment LenderViewWithdrawalExecution on WithdrawalExecution {
    id
    account {
      address
    }
    normalizedAmount
    blockNumber
    blockTimestamp
    transactionHash
  }

  fragment LenderViewWithdrawalWithEvents on LenderWithdrawalStatus {
    ...LenderViewWithdrawalStatus
    batch {
      ...LenderViewWithdrawalBatch
    }
    requests {
      ...LenderViewWithdrawalRequest
    }
    executions {
      ...LenderViewWithdrawalExecution
    }
  }

  query AppLenderWithdrawalsForMarket($market: ID!, $lender: Bytes!) {
    market(id: $market) {
      lenders(where: { address: $lender }) {
        incompleteWithdrawals: withdrawals(
          first: 200
          where: { isCompleted: false }
        ) {
          ...LenderViewWithdrawalWithEvents
        }
        completeWithdrawals: withdrawals(
          first: 200
          where: { isCompleted: true }
        ) {
          ...LenderViewWithdrawalWithEvents
        }
      }
    }
  }
` as TypedDocumentNode<
  LenderWithdrawalsForMarketData,
  LenderWithdrawalsForMarketVariables
>
