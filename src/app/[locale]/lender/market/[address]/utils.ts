import { LenderRole, Market, MarketAccount } from "@wildcatfi/wildcat-sdk"

import { DepositAgreementGateState } from "@/utils/depositAgreementGate"
import { ToUGateState } from "@/utils/serviceAgreementState"

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
  | "request-access"
  | "actions"

export const getLenderSurfaceState = ({
  isConnected,
  isDifferentChain,
  authorizedInMarket,
}: {
  isConnected: boolean
  isDifferentChain: boolean
  authorizedInMarket: boolean | undefined
}): LenderSurfaceState => {
  if (!isConnected) return "connect"
  if (isDifferentChain) return "switch-network"
  if (authorizedInMarket === undefined) return "authorization-loading"
  return authorizedInMarket ? "actions" : "request-access"
}

export const shouldShowLenderRequestBanner = ({
  isConnected,
  isDifferentChain,
  authorizedInMarket,
}: {
  isConnected: boolean
  isDifferentChain: boolean
  authorizedInMarket: boolean | undefined
}) =>
  getLenderSurfaceState({
    isConnected,
    isDifferentChain,
    authorizedInMarket,
  }) === "request-access"

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
  authorizedInMarket,
  depositAvailable,
  touGateState,
  isAgreementFetching,
  depositAgreementState,
  withdrawalAvailable,
  claimAvailable,
}: {
  isConnected: boolean
  isDifferentChain: boolean
  authorizedInMarket: boolean | undefined
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
    authorizedInMarket,
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
    canClaim: surface === "actions" && claimAvailable,
  }
}
