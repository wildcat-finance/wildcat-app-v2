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
}

type MarketLike = {
  controller?: string
  hooksConfig?: MarketHooksConfigLike
  onboardingMode?: MarketOnboardingMode
}

type MarketAccountLike = {
  market: MarketLike
}

export const hasActivePullRoleProvider = (
  roleProviders: readonly Pick<RoleProvider, "isApproved" | "isPullProvider">[],
): boolean =>
  roleProviders.some(
    ({ isApproved, isPullProvider }) => isApproved && isPullProvider,
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
): boolean => account.market.onboardingMode === MarketOnboardingMode.SelfOnboard
