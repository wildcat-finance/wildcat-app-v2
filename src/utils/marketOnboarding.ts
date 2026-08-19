import {
  DepositStatus,
  MarketOnboardingMode,
  MarketVersion,
} from "@wildcatfi/wildcat-sdk"

export { MarketOnboardingMode }

export type MarketOnboardingByAddress = Record<string, MarketOnboardingMode>

export enum LenderMarketAction {
  Deposit = "deposit",
  RequestAccess = "request-access",
  DepositUnavailable = "deposit-unavailable",
  Unavailable = "unavailable",
}

export const getKnownMarketOnboardingMode = (
  version: MarketVersion,
  marketAddress: string,
  onboardingByMarket: MarketOnboardingByAddress,
): MarketOnboardingMode | undefined => {
  if (version === MarketVersion.V1) {
    return MarketOnboardingMode.BorrowerApproval
  }

  return onboardingByMarket[marketAddress.toLowerCase()]
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
