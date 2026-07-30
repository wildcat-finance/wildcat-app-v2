import {
  LenderRole,
  Market,
  MarketAccount,
  QueueWithdrawalStatus,
} from "@wildcatfi/wildcat-sdk"

import { DepositAgreementGateState } from "@/utils/depositAgreementGate"
import { ToUGateState } from "@/utils/serviceAgreementState"

import type { LenderAccountResolutionStatus } from "./hooks/useLenderMarketAccount"
import { LenderStatus } from "./interface"

export const getEffectiveLenderRole = (
  account: MarketAccount,
): LenderStatus => {
  switch (account.inferredRole) {
    case LenderRole.DepositAndWithdraw:
      return LenderStatus.DepositAndWithdraw
    case LenderRole.WithdrawOnly:
      return LenderStatus.WithdrawOnly
    case LenderRole.Blocked:
      return LenderStatus.Blocked
    case LenderRole.Null:
    default:
      return LenderStatus.Null
  }
}

export const borrowerPenaltyWarningThresholdSeconds = 30 * 24 * 60 * 60

export const getPenaltySecondsPastGrace = (market: Market) =>
  market.timeDelinquent - market.delinquencyGracePeriod

export const shouldMarketTriggerBorrowerPenaltyWarning = (market: Market) =>
  !market.isClosed &&
  market.isIncurringPenalties &&
  getPenaltySecondsPastGrace(market) >= borrowerPenaltyWarningThresholdSeconds

export type LenderSurfaceState =
  | "connect"
  | "switch-network"
  | "authorization-loading"
  | "authorization-error"
  | "blocked"
  | "request-access"
  | "actions"

export type LenderAccessState =
  | "resolving"
  | "error"
  | "blocked"
  | "unauthorized"
  | "authorized"

export const resolveLenderAccessState = ({
  authoritativeStatus,
  role,
}: {
  authoritativeStatus: LenderAccountResolutionStatus
  role: LenderStatus | undefined
}): LenderAccessState => {
  if (authoritativeStatus === "error") return "error"
  if (authoritativeStatus !== "resolved") return "resolving"
  if (role === LenderStatus.Blocked) return "blocked"
  if (
    role === LenderStatus.DepositAndWithdraw ||
    role === LenderStatus.WithdrawOnly
  ) {
    return "authorized"
  }
  return "unauthorized"
}

export type LenderWithdrawalActionState =
  | "resolving"
  | "resolution-error"
  | "no-balance"
  | "requires-access"
  | "fixed-term"
  | "withdrawal-window-closed"
  | "insufficient-balance"
  | "insufficient-role"
  | "ready"

export const resolveLenderWithdrawalActionState = ({
  accessState,
  hasMarketAccount,
  hasMarketBalance,
  withdrawalAvailability,
  periodicWindowClosed,
}: {
  accessState: LenderAccessState
  hasMarketAccount: boolean
  hasMarketBalance: boolean
  withdrawalAvailability: QueueWithdrawalStatus | undefined
  periodicWindowClosed: boolean
}): LenderWithdrawalActionState => {
  if (accessState === "resolving") return "resolving"
  if (accessState === "error") return "resolution-error"
  if (!hasMarketAccount || withdrawalAvailability === undefined) {
    return "resolving"
  }
  if (!hasMarketBalance) return "no-balance"
  if (periodicWindowClosed) return "withdrawal-window-closed"

  switch (withdrawalAvailability) {
    case QueueWithdrawalStatus.Ready:
      return accessState === "authorized" ? "ready" : "insufficient-role"
    case QueueWithdrawalStatus.RequiresAccess:
      return "requires-access"
    case QueueWithdrawalStatus.MarketInClosedTerm:
      return "fixed-term"
    case QueueWithdrawalStatus.WithdrawalWindowClosed:
      return "withdrawal-window-closed"
    case QueueWithdrawalStatus.InsufficientBalance:
      return "insufficient-balance"
    case QueueWithdrawalStatus.InsufficientRole:
      return "insufficient-role"
    default:
      return "resolving"
  }
}

export const getLenderSurfaceState = ({
  isConnected,
  isDifferentChain,
  accessState,
}: {
  isConnected: boolean
  isDifferentChain: boolean
  accessState: LenderAccessState
}): LenderSurfaceState => {
  if (!isConnected) return "connect"
  if (isDifferentChain) return "switch-network"
  if (accessState === "resolving") return "authorization-loading"
  if (accessState === "error") return "authorization-error"
  if (accessState === "blocked") return "blocked"
  if (accessState === "unauthorized") return "request-access"
  return "actions"
}

export const shouldShowLenderRequestBanner = ({
  isConnected,
  isDifferentChain,
  accessState,
  hasLenderTransactions,
  isWithdrawalActivityLoading,
}: {
  isConnected: boolean
  isDifferentChain: boolean
  accessState: LenderAccessState
  hasLenderTransactions: boolean
  isWithdrawalActivityLoading: boolean
}) =>
  !hasLenderTransactions &&
  !isWithdrawalActivityLoading &&
  getLenderSurfaceState({
    isConnected,
    isDifferentChain,
    accessState,
  }) === "request-access"

export const shouldShowLenderTransactions = ({
  accessState,
  hasMarketPosition,
  hasWithdrawalActivity,
}: {
  accessState: LenderAccessState
  hasMarketPosition: boolean
  hasWithdrawalActivity: boolean
}) => accessState === "authorized" || hasMarketPosition || hasWithdrawalActivity

export type LenderDepositActionState =
  | "hidden"
  | "unavailable"
  | "checking-tou"
  | "retry-tou"
  | "tou-blocked"
  | DepositAgreementGateState

export const resolveLenderActionState = ({
  isConnected,
  isDifferentChain,
  accessState,
  depositAvailable,
  touGateState,
  isAgreementFetching,
  depositAgreementState,
  withdrawalAvailable,
  claimAvailable,
}: {
  isConnected: boolean
  isDifferentChain: boolean
  accessState: LenderAccessState
  depositAvailable: boolean
  touGateState: ToUGateState
  isAgreementFetching: boolean
  depositAgreementState: DepositAgreementGateState
  withdrawalAvailable: boolean
  claimAvailable: boolean
}) => {
  const surface = getLenderSurfaceState({
    isConnected,
    isDifferentChain,
    accessState,
  })

  let deposit: LenderDepositActionState = "hidden"
  if (surface === "actions") {
    if (!depositAvailable) deposit = "unavailable"
    else if (touGateState === "unknown") {
      deposit = isAgreementFetching ? "checking-tou" : "retry-tou"
    } else if (touGateState === "blocked") deposit = "tou-blocked"
    else deposit = depositAgreementState
  }

  return {
    surface,
    deposit,
    canWithdraw: surface === "actions" && withdrawalAvailable,
    canClaim: isConnected && !isDifferentChain && claimAvailable,
  }
}
