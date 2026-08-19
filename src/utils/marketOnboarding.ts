import {
  DepositStatus,
  Market,
  MarketOnboardingMode,
  MarketVersion,
} from "@wildcatfi/wildcat-sdk"

import { hasActivePullRoleProvider } from "./marketCapabilities"

export { MarketOnboardingMode }

export type MarketOnboardingByAddress = Record<string, MarketOnboardingMode>

export enum LenderMarketAction {
  Deposit = "deposit",
  RequestAccess = "request-access",
  DepositUnavailable = "deposit-unavailable",
  Unavailable = "unavailable",
}

// Catalogue rows are indexed data. Derive their stable onboarding policy from
// the provider indexes because older subgraphs can report the borrower-only
// push provider with an incorrect `isPullProvider: true` boolean.
export const getSubgraphMarketOnboardingMode = (
  market: Market,
): MarketOnboardingMode | undefined => {
  if (market.version === MarketVersion.V1) {
    return MarketOnboardingMode.BorrowerApproval
  }

  const { hooksConfig } = market
  if (!hooksConfig) return undefined

  if (!hooksConfig.flags.useOnDeposit || !hooksConfig.depositRequiresAccess) {
    return MarketOnboardingMode.SelfOnboard
  }

  if (!market.roleProviders) return undefined

  return hasActivePullRoleProvider(market.roleProviders)
    ? MarketOnboardingMode.SelfOnboard
    : MarketOnboardingMode.BorrowerApproval
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
