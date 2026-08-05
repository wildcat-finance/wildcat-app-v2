import { DepositStatus, Market, MarketVersion } from "@wildcatfi/wildcat-sdk"

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

type V2MarketAccessData = {
  hooksConfig: {
    flags: {
      useOnDeposit: boolean
    }
    depositRequiresAccess: boolean
  }
  hooks: {
    pullProviders: readonly unknown[]
  }
}

export const getV2MarketOnboardingMode = ({
  hooksConfig,
  hooks,
}: V2MarketAccessData): MarketOnboardingMode => {
  if (!hooksConfig.flags.useOnDeposit || !hooksConfig.depositRequiresAccess) {
    return MarketOnboardingMode.SelfOnboard
  }

  return hooks.pullProviders.length > 0
    ? MarketOnboardingMode.SelfOnboard
    : MarketOnboardingMode.BorrowerApproval
}

export const getMarketOnboardingMode = (
  onboardingByMarket: MarketOnboardingByAddress,
  marketAddress: string,
): MarketOnboardingMode | undefined =>
  onboardingByMarket[marketAddress.toLowerCase()]

// Mirrors the lens-based getV2MarketOnboardingMode using only subgraph-derived
// data, so markets can be classified before the on-chain lens sweep completes.
// market.canSelfOnboard covers approved pull providers only, so open-access
// markets (deposit hook off or ungated) are classified first. Returns
// undefined when the market's hooks instance isn't hydrated - callers should
// treat that as "pending" and let the lens result fill in.
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

  return market.canSelfOnboard
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
