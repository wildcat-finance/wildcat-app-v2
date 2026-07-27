import { DepositStatus, MarketVersion } from "@wildcatfi/wildcat-sdk"

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
