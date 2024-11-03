import type {
  DepositStatus,
  RepayStatus,
  CloseMarketStatus,
  SetAprStatus,
  QueueWithdrawalStatus,
} from "@wildcatfi/wildcat-sdk"

type ExcludeReady<T> = T extends "Ready" ? never : T

type DepositErrorStatuses = {
  [key in ExcludeReady<DepositStatus>]: string | undefined
}
type RepayErrorStatuses = {
  [key in ExcludeReady<RepayStatus>]: string | undefined
}
type CloseMarketErrorStatuses = {
  [key in ExcludeReady<CloseMarketStatus>]: string | undefined
}
type SetAPRErrorStatuses = {
  [key in ExcludeReady<SetAprStatus>]: string | undefined
}
type QueueWithdrawalStatuses = {
  [key in ExcludeReady<QueueWithdrawalStatus>]: string | undefined
}

type SDKErrorsMapping = {
  deposit: DepositErrorStatuses
  queueWithdrawal: QueueWithdrawalStatuses
  repay: RepayErrorStatuses
  closeMarket: CloseMarketErrorStatuses
  setApr: SetAPRErrorStatuses
}

export const SDK_ERRORS_MAPPING: SDKErrorsMapping = {
  deposit: {
    InsufficientRole:
      "Lender restricted to withdrawing existing debt, no further deposits",
    ExceedsMaximumDeposit:
      "You're attempting to deposit more than the maximum capacity",
    InsufficientBalance:
      "You don't have enough of the underlying token in your wallet",
    BelowMinimumDeposit: "Your deposit is below the minimum for this market",
    InsufficientAllowance: undefined,
    MarketClosed: "Market is closed",
    Blocked:
      "Lender restricted to withdrawing existing debt, no further deposits",
    RequiresAccess: "Lender lacks the necessary credentials to deposit",
  },

  queueWithdrawal: {
    InsufficientRole: "You can not withdraw funds from this market",
    InsufficientBalance:
      "You don't have enough of the market token in your wallet",
    MarketInClosedTerm: "Market is in closed term",
    RequiresAccess: "Lender lacks the necessary credentials to withdraw",
  },

  repay: {
    InsufficientBalance:
      "You don't have enough of the underlying token in your wallet",
    InsufficientAllowance: undefined,
    ExceedsOutstandingDebt: "You're attempting to repay more than you owe",
    MarketClosed: "Market is closed",
  },

  closeMarket: {
    NotBorrower: "Address attempting to close market is not the borrower",
    UnpaidWithdrawalBatches: "There are unpaid withdrawal batches",
    InsufficientBalance:
      "Your wallet's balance of the underlying token is insufficient",
    InsufficientAllowance: undefined,
    EarlyClosureNotAllowed: "Market can not be closed before maturity",
  },

  setApr: {
    NotBorrower: "Address attempting to adjust APR is not the borrower",
    InvalidApr: "APR must be between 0% and 100%",
    InsufficientReserves:
      "Liquid reserves of the market insufficient for increased reserve ratio",
    DecreaseDuringFixedTerm:
      "Market is in fixed term, APR can only be increased",
  },
}
