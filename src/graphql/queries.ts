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
      id
      name
      asset {
        symbol
      }
    }
  }
`

export const LENDER_MARKETS = gql`
  query ($where: Market_filter) {
    markets(where: $where) {
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

export const AUTHORIZATION_CHANGES = gql`
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

export const LENDER_AUTHORIZATION_CHANGES = gql`
  query ($where: LenderAuthorizationChange_filter) {
    lenderAuthorizationChanges(where: $where) {
      blockTimestamp
      authorization {
        marketAccounts {
          market {
            name
            id
            borrower
          }
        }
      }
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

// export const LENDER_ADDEDS = gql`
//   query ($where: LenderAuthorizationChange_filter) {
//     lenderAuthorizationChanges(where: $where) {
//       authorized
//       blockTimestamp
//       transactionHash
//     }
//   }
// `

// where: {
//   lender: address,
//   blockTimestamp_gt: getLastFetchedTimestamp(address),
// }

// export const LENDER_WITHDRAWAL_RESULTS = gql`
//   query ($where: DebtRepaid_filter) {
//     debtRepaids(where: $where) {
//       transactionHash
//       blockTimestamp
//       assetAmount
//       market {
//         symbol
//         name
//         decimals
//       }
//     }
//   }
// `

// where: {
//   blockTimestamp_gt: getLastFetchedTimestamp(address),
// },

export const RECENT_DEPOSITS = gql`
  query ($where: Deposit_filter, $first: Int, $skip: Int) {
    deposits(
      where: $where
      first: $first
      skip: $skip
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      id
      assetAmount
      blockTimestamp
      account {
        address
      }
      market {
        id
      }
    }
  }
`

export const RECENT_WITHDRAWAL_REQUESTS = gql`
  query ($where: WithdrawalRequest_filter, $first: Int, $skip: Int) {
    withdrawalRequests(
      where: $where
      first: $first
      skip: $skip
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      id
      normalizedAmount
      blockTimestamp
      market {
        id
      }
    }
  }
`

// Page each relationship at the root: nested collections have independent
// limits. Membership and attachments exist only in the V2.5 schema.
export const LENDER_POLICY_ACCESS_LIST_MEMBERSHIPS = gql`
  query ($first: Int!, $where: RoleProviderMember_filter!) {
    roleProviderMembers(
      first: $first
      orderBy: id
      orderDirection: asc
      where: $where
    ) {
      id
      provider {
        id
      }
    }
  }
`

export const LENDER_POLICY_ACCESS_LIST_HOOKS = gql`
  query ($first: Int!, $where: RoleProvider_filter!) {
    roleProviders(
      first: $first
      orderBy: id
      orderDirection: asc
      where: $where
    ) {
      id
      hooks {
        id
      }
    }
  }
`

// Direct hook grants are available on both the legacy and V2.5 schemas.
export const LENDER_POLICY_HOOKS_ACCESS = gql`
  query ($first: Int!, $where: LenderHooksAccess_filter!) {
    lenderHooksAccesses(
      first: $first
      orderBy: id
      orderDirection: asc
      where: $where
    ) {
      id
      lastProvider {
        isApproved
      }
      hooks {
        id
      }
    }
  }
`

export const MARKET_TERMINATEDS = gql`
  query ($where: MarketClosed_filter) {
    marketCloseds(where: $where) {
      blockTimestamp
      transactionHash
      market {
        name
      }
    }
  }
`

// where: {
//   market_: {
//     id_in: []
//   },
//   blockTimestamp_gt:
// }

// export const LENDER_REMOVALS = gql`
//   query ($where: DebtRepaid_filter) {
//     debtRepaids(where: $where) {
//       transactionHash
//       blockTimestamp
//       assetAmount
//       market {
//         symbol
//         name
//         decimals
//       }
//     }
//   }
// `
