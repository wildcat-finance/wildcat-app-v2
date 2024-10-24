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
