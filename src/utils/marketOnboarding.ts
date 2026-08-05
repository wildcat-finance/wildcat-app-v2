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

/** Whether a hooks instance (keyed by lowercase address) has an approved pull
 *  provider, i.e. lenders can obtain a credential themselves. */
export type PullProvidersByHooksAddress = Record<string, boolean>

// Mirrors the lens-based getV2MarketOnboardingMode using only subgraph-derived
// data, so markets can be classified before the on-chain lens sweep completes.
// Returns undefined when the pull-provider set for a gated market isn't known
// yet - callers should treat that as "pending" and let the lens result fill in.
export const getSubgraphMarketOnboardingMode = (
  market: Market,
  hasPullProviderByHooks: PullProvidersByHooksAddress | undefined,
): MarketOnboardingMode | undefined => {
  if (market.version === MarketVersion.V1) {
    return MarketOnboardingMode.BorrowerApproval
  }

  const { hooksConfig } = market
  if (!hooksConfig) return undefined

  if (!hooksConfig.flags.useOnDeposit || !hooksConfig.depositRequiresAccess) {
    return MarketOnboardingMode.SelfOnboard
  }

  const hasPullProvider =
    hasPullProviderByHooks?.[hooksConfig.hooksAddress.toLowerCase()]
  if (hasPullProvider === undefined) return undefined

  return hasPullProvider
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
