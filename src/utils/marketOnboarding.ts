import {
  DepositStatus,
  Market,
  MarketOnboardingMode,
  MarketVersion,
} from "@wildcatfi/wildcat-sdk"

import { hasActiveLenderOnboardingRoleProvider } from "./marketCapabilities"

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
    return MarketOnboardingMode.Managed
  }

  const { hooksConfig } = market
  if (!hooksConfig) return undefined

  if (!hooksConfig.flags.useOnDeposit || !hooksConfig.depositRequiresAccess) {
    return MarketOnboardingMode.Open
  }

  if (!market.roleProviders) return undefined

  return hasActiveLenderOnboardingRoleProvider(market.roleProviders)
    ? MarketOnboardingMode.Self
    : MarketOnboardingMode.Managed
}

export const getKnownMarketOnboardingMode = (
  version: MarketVersion,
  marketAddress: string,
  onboardingByMarket: MarketOnboardingByAddress,
): MarketOnboardingMode | undefined => {
  if (version === MarketVersion.V1) {
    return MarketOnboardingMode.Managed
  }

  return onboardingByMarket[marketAddress.toLowerCase()]
}

export enum LenderOnboardingType {
  Open = "open",
  Self = "self",
  Managed = "managed",
  Unknown = "unknown",
}

export const isSelfServiceMarketOnboardingMode = (
  onboardingMode: MarketOnboardingMode | undefined,
): boolean =>
  onboardingMode === MarketOnboardingMode.Open ||
  onboardingMode === MarketOnboardingMode.Self

export const getLenderOnboardingType = (
  onboardingMode: MarketOnboardingMode | undefined,
): LenderOnboardingType => {
  switch (onboardingMode) {
    case MarketOnboardingMode.Open:
      return LenderOnboardingType.Open
    case MarketOnboardingMode.Self:
      return LenderOnboardingType.Self
    case MarketOnboardingMode.Managed:
      return LenderOnboardingType.Managed
    default:
      return LenderOnboardingType.Unknown
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
    onboardingMode === MarketOnboardingMode.Managed &&
    depositStatus !== DepositStatus.Blocked &&
    depositStatus !== DepositStatus.MarketClosed
  ) {
    return LenderMarketAction.RequestAccess
  }

  if (
    onboardingMode === MarketOnboardingMode.Self &&
    depositStatus === DepositStatus.RequiresAccess
  ) {
    return LenderMarketAction.DepositUnavailable
  }

  return LenderMarketAction.Unavailable
}
