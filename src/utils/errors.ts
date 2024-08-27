import type {
  DepositStatus,
  RepayStatus,
  CloseMarketStatus,
  SetAprStatus,
  QueueWithdrawalStatus,
} from "@wildcatfi/wildcat-sdk"

type ExcludeReady<T> = T extends "Ready" ? never : T

type DepositErrorStatuses = {
  [key in ExcludeReady<DepositStatus["status"]>]: string | undefined
}
type RepayErrorStatuses = {
  [key in ExcludeReady<RepayStatus["status"]>]: string | undefined
}
type CloseMarketErrorStatuses = {
  [key in ExcludeReady<CloseMarketStatus["status"]>]: string | undefined
}
type SetAPRErrorStatuses = {
  [key in ExcludeReady<SetAprStatus["status"]>]: string | undefined
}
type QueueWithdrawalStatuses = {
  [key in ExcludeReady<QueueWithdrawalStatus["status"]>]: string | undefined
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
    InsufficientAllowance: undefined,
  },

  queueWithdrawal: {
    InsufficientRole: "You can not withdraw funds from this market",
    InsufficientBalance:
      "You don't have enough of the market token in your wallet",
  },

  repay: {
    InsufficientBalance:
      "You don't have enough of the underlying token in your wallet",
    InsufficientAllowance: undefined,
    ExceedsOutstandingDebt: "You're attempting to repay more than you owe",
  },

  closeMarket: {
    NotBorrower: "Address attempting to close market is not the borrower",
    UnpaidWithdrawalBatches: "There are unpaid withdrawal batches",
    InsufficientBalance:
      "Your wallet's balance of the underlying token is insufficient",
    InsufficientAllowance: undefined,
  },

  setApr: {
    NotBorrower: "Address attempting to adjust APR is not the borrower",
    InvalidApr: "APR must be between 0% and 100%",
    InsufficientReserves:
      "Liquid reserves of the market insufficient for increased reserve ratio",
  },
}
