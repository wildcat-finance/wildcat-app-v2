import { DepositStatus, Market, MarketVersion } from "@wildcatfi/wildcat-sdk"

import { hasActivePullRoleProvider } from "./marketCapabilities"

export enum MarketOnboardingMode {
  SelfOnboard = "self-onboard",
  BorrowerApproval = "borrower-approval",
}

export type MarketOnboardingByAddress = Record<string, MarketOnboardingMode>

export enum LenderMarketAction {
  Deposit = "deposit",
  RequestAccess = "request-access",
  DepositUnavailable = "deposit-unavailable",
  Unavailable = "unavailable",
}

export const getMarketOnboardingMode = (
  onboardingByMarket: MarketOnboardingByAddress,
  marketAddress: string,
): MarketOnboardingMode | undefined =>
  onboardingByMarket[marketAddress.toLowerCase()]

// Classify markets from catalogue data without waiting for a lens sweep.
// Open-access markets (deposit hook off or ungated) are classified first.
// For gated markets, use provider indexes rather than `market.canSelfOnboard`:
// the subgraph can mark the borrower-only push provider as `isPullProvider`,
// while its negative pull index correctly means that lenders cannot self-onboard.
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

  if (!market.hooksInstance) return undefined

  return hasActivePullRoleProvider(market.hooksInstance.roleProviders)
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

  return getMarketOnboardingMode(onboardingByMarket, marketAddress)
}

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
