import {
  FixedTermHooksConfig,
  HooksKind,
  MarketOnboardingMode,
  type RoleProvider,
} from "@wildcatfi/wildcat-sdk"

type MarketHooksConfigLike = {
  kind?: HooksKind
  hooksAddress?: string
  fixedTermEndTime?: number
  depositRequiresAccess?: boolean
  flags?: { useOnDeposit?: boolean }
}

type MarketLike = {
  controller?: string
  hooksConfig?: MarketHooksConfigLike
  onboardingMode?: MarketOnboardingMode
  roleProviders?: readonly Pick<
    RoleProvider,
    "isApproved" | "pullProviderIndex"
  >[]
}

type MarketAccountLike = {
  market: MarketLike
}

// The hooks contract stores "no pull-provider slot" as max uint24, while the
// subgraph serializes the same sentinel as -1.
const NULL_PROVIDER_INDEX = 2 ** 24 - 1

export const hasActivePullRoleProvider = (
  roleProviders: readonly Pick<
    RoleProvider,
    "isApproved" | "pullProviderIndex"
  >[],
): boolean =>
  roleProviders.some(
    ({ isApproved, pullProviderIndex }) =>
      isApproved &&
      pullProviderIndex >= 0 &&
      pullProviderIndex !== NULL_PROVIDER_INDEX,
  )

export const isHooksManagedMarket = (market: MarketLike): boolean =>
  market.hooksConfig?.hooksAddress !== undefined

export const getMarketPolicyAddress = (
  market: MarketLike,
): string | undefined => market.hooksConfig?.hooksAddress ?? market.controller

export const getFixedTermHooksConfig = (
  market: MarketLike,
): FixedTermHooksConfig | undefined =>
  market.hooksConfig?.kind === HooksKind.FixedTerm
    ? (market.hooksConfig as FixedTermHooksConfig)
    : undefined

export const isFixedTermMarket = (market: MarketLike): boolean =>
  getFixedTermHooksConfig(market) !== undefined

export const isSelfOnboardMarketAccount = (
  account: MarketAccountLike,
): boolean => {
  const { market } = account
  const { hooksConfig } = market

  if (!hooksConfig) {
    return market.onboardingMode === MarketOnboardingMode.SelfOnboard
  }

  if (
    hooksConfig.depositRequiresAccess === false ||
    hooksConfig.flags?.useOnDeposit === false
  ) {
    return true
  }

  if (market.roleProviders) {
    return hasActivePullRoleProvider(market.roleProviders)
  }

  return market.onboardingMode === MarketOnboardingMode.SelfOnboard
}
