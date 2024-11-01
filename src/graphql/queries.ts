import { gql } from "@apollo/client"

export const BORROWER_REGISTRATION_CHANGES = gql`
  query ($where: BorrowerRegistrationChange_filter) {
    borrowerRegistrationChanges(where: $where) {
      blockTimestamp
      isRegistered
      transactionHash
    }
  }
`

export const BORROWER_MARKETS = gql`
  query ($where: Market_filter) {
    markets(where: $where) {
      reserveRatioBipsUpdatedRecords {
        newReserveRatioBips
        oldReserveRatioBips
        transactionHash
        blockTimestamp
        blockNumber
        id
      }
      id
      name
      asset {
        symbol
      }
    }
  }
`

export const RESERVE_RATIO_BIPS_UPDATEDS = gql`
  query ($where: ReserveRatioBipsUpdated_filter) {
    reserveRatioBipsUpdateds(where: $where) {
      newReserveRatioBips
      oldReserveRatioBips
      transactionHash
      blockTimestamp
      market {
        name
        symbol
      }
    }
  }
`

export const LENDER_AUTHORIZATION_CHANGES = gql`
  query (
    $where: LenderAuthorizationChange_filter
    $marketAccountsWhere: LenderAccount_filter
  ) {
    lenderAuthorizationChanges(where: $where) {
      blockTimestamp
      authorization {
        marketAccounts(where: $marketAccountsWhere) {
          market {
            name
            id
          }
        }
      }
      lender
      transactionHash
      authorized
    }
  }
`

export const WITHDRAWAL_BATCH_CREATEDS = gql`
  query ($where: WithdrawalBatchCreated_filter) {
    withdrawalBatchCreateds(where: $where) {
      transactionHash
      blockTimestamp
      batch {
        expiry
        market {
          id
          name
        }
      }
    }
  }
`

export const WITHDRAWAL_EXECUTIONS = gql`
  query {
    withdrawalExecutions {
      transactionHash
      blockTimestamp
      normalizedAmount
      batch {
        market {
          id
          name
          symbol
          decimals
        }
      }
    }
  }
`

export const WITHDRAWAL_BATCH_EXPIREDS = gql`
  query ($where: WithdrawalBatchExpired_filter) {
    withdrawalBatchExpireds(where: $where) {
      transactionHash
      blockTimestamp
      scaledTotalAmount
      scaledAmountBurned
      normalizedAmountOwed
      batch {
        market {
          name
          id
          symbol
          decimals
        }
      }
    }
  }
`

export const BORROWS = gql`
  query ($where: Borrow_filter) {
    borrows(where: $where) {
      transactionHash
      blockTimestamp
      assetAmount
      market {
        symbol
        name
        decimals
      }
    }
  }
`

export const DEBT_REPAIDS = gql`
  query ($where: DebtRepaid_filter) {
    debtRepaids(where: $where) {
      transactionHash
      blockTimestamp
      assetAmount
      market {
        symbol
        name
        decimals
      }
    }
  }
`
