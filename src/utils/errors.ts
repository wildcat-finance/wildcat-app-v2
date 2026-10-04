import type {
  DepositStatus,
  RepayStatus,
  CloseMarketStatus,
  ProposeAnnualInterestBipsStatus,
  SetAprStatus,
  QueueWithdrawalStatus,
  SetMaxTotalSupplyStatus,
  SetMinimumDepositStatus,
  SetFixedTermEndTimeStatus,
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
type ProposeAPRErrorStatuses = {
  [key in ExcludeReady<ProposeAnnualInterestBipsStatus>]: string | undefined
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
  proposeApr: ProposeAPRErrorStatuses
  setCapacity: Record<ExcludeReady<SetMaxTotalSupplyStatus>, string>
  setMinimumDeposit: Record<ExcludeReady<SetMinimumDepositStatus>, string>
  setMaturity: Record<ExcludeReady<SetFixedTermEndTimeStatus>, string>
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
    MarketInRepayment: "Deposits are unavailable after the repayment date",
    Blocked:
      "Lender restricted to withdrawing existing debt, no further deposits",
    RequiresAccess: "Lender lacks the necessary credentials to deposit",
  },

  queueWithdrawal: {
    InsufficientRole: "You can not withdraw funds from this market",
    InsufficientBalance:
      "You don't have enough of the market token in your wallet",
    MarketInClosedTerm: "Market is in closed term",
    WithdrawalWindowClosed:
      "Withdrawals are only available during this market's withdrawal window",
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
    AprReductionNotProposed:
      "APR reduction must be proposed before it can be executed",
    AprChangeDoesNotMatchProposal:
      "APR change does not match the pending proposal",
    AprChangeNotReady: "APR change can not be executed yet",
    AprChangeExpired:
      "The APR reduction proposal has expired and must be re-proposed",
    UnpaidWithdrawalsExist:
      "Pending withdrawals must be paid before this APR change",
  },

  proposeApr: {
    MarketInRepayment:
      "New APR reduction proposals are unavailable after the repayment date",
    NotBorrower: "Address attempting to propose APR is not the borrower",
    NotV2Market: "APR proposals are only supported for V2 markets",
    NotPeriodicTermMarket:
      "APR reduction proposals are only supported for periodic markets",
    InvalidApr: "APR must be between 0% and 100%",
    NotReduction: "Periodic APR proposals must reduce the current APR",
    WithdrawalWindowOpen:
      "APR reductions can only be proposed outside withdrawal windows",
  },
  setCapacity: {
    MarketInRepayment: "Capacity cannot be changed after the repayment date",
    NotBorrower: "Only the borrower can change capacity",
    BelowCurrentSupply: "Capacity cannot be below the current supply",
  },
  setMinimumDeposit: {
    MarketInRepayment:
      "Minimum deposit cannot be changed after the repayment date",
    NotBorrower: "Only the borrower can change the minimum deposit",
    NotV2Market: "This market does not support a minimum deposit",
    DepositHookNotEnabled:
      "This market does not support a positive minimum deposit.",
    MinimumDepositTooHigh:
      "Minimum deposit is too large for this periodic market.",
  },
  setMaturity: {
    MarketInRepayment: "Maturity cannot be changed after the repayment date",
    NotBorrower: "Only the borrower can change maturity",
    NotV2Market: "This market does not support maturity changes",
    NotFixedTermMarket: "This is not a fixed term market",
    FixedTermEndTimeIncrease: "You cannot increase the maturity date",
    FixedTermEndTimeNotChangeable:
      "This market does not allow modifications to the maturity date",
  },
}
