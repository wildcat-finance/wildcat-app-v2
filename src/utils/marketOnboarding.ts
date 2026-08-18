import { DepositStatus, MarketOnboardingMode } from "@wildcatfi/wildcat-sdk"

export enum LenderMarketAction {
  Deposit = "deposit",
  RequestAccess = "request-access",
  DepositUnavailable = "deposit-unavailable",
  Unavailable = "unavailable",
}

export enum MarketAccessType {
  SelfOnboard = "selfOnboard",
  BorrowerAllowlist = "borrowerAllowlist",
  Unknown = "unknown",
}

export const getMarketAccessType = (
  onboardingMode: MarketOnboardingMode | undefined,
): MarketAccessType => {
  switch (onboardingMode) {
    case MarketOnboardingMode.SelfOnboard:
      return MarketAccessType.SelfOnboard
    case MarketOnboardingMode.BorrowerApproval:
      return MarketAccessType.BorrowerAllowlist
    default:
      return MarketAccessType.Unknown
  }
}

/**
 * Resolve the lender-specific action separately from the market's stable
 * onboarding policy.
 */
export const getLenderMarketAction = (
  onboardingMode: MarketOnboardingMode | undefined,
  depositStatus: DepositStatus,
): LenderMarketAction => {
  if (depositStatus === DepositStatus.Ready) {
    return LenderMarketAction.Deposit
  }

  if (
    onboardingMode === MarketOnboardingMode.BorrowerApproval &&
    depositStatus !== DepositStatus.Blocked &&
    depositStatus !== DepositStatus.MarketClosed
  ) {
    return LenderMarketAction.RequestAccess
  }

  if (
    onboardingMode === MarketOnboardingMode.SelfOnboard &&
    depositStatus === DepositStatus.RequiresAccess
  ) {
    return LenderMarketAction.DepositUnavailable
  }

  return LenderMarketAction.Unavailable
}
