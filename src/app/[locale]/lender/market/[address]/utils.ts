import { LenderRole, Market, MarketAccount } from "@wildcatfi/wildcat-sdk"

import type { MarketAccountResolutionStatus } from "@/hooks/useMarketAccount"

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
  authoritativeStatus: MarketAccountResolutionStatus
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

export type LenderBannerState =
  | "none"
  | "connect"
  | "authorization-error"
  | "blocked"
  | "request-access"

export const getLenderBannerState = ({
  isWalletHydrated,
  isConnected,
  isConnecting,
  isReconnecting,
  isDifferentChain,
  accessState,
  hasLenderTransactions,
  isWithdrawalActivityLoading,
}: {
  isWalletHydrated: boolean
  isConnected: boolean
  isConnecting: boolean
  isReconnecting: boolean
  isDifferentChain: boolean
  accessState: LenderAccessState
  hasLenderTransactions: boolean
  isWithdrawalActivityLoading: boolean
}): LenderBannerState => {
  if (!isWalletHydrated || isConnecting || isReconnecting) return "none"

  const surface = getLenderSurfaceState({
    isConnected,
    isDifferentChain,
    accessState,
  })

  if (surface === "connect") return "connect"
  if (surface === "authorization-error") return "authorization-error"
  if (surface === "blocked") return "blocked"
  if (
    surface === "request-access" &&
    !hasLenderTransactions &&
    !isWithdrawalActivityLoading
  ) {
    return "request-access"
  }
  return "none"
}

export const shouldShowLenderTransactions = ({
  accessState,
  hasMarketPosition,
  hasWithdrawalActivity,
}: {
  accessState: LenderAccessState
  hasMarketPosition: boolean
  hasWithdrawalActivity: boolean
}) => accessState === "authorized" || hasMarketPosition || hasWithdrawalActivity
