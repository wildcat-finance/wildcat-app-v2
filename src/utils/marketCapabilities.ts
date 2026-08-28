import {
  FixedTermHooksConfig,
  getDeploymentAddress,
  HooksKind,
  MarketOnboardingMode,
  type RoleProvider,
  type SupportedChainId,
} from "@wildcatfi/wildcat-sdk"

type MarketHooksConfigLike = {
  kind?: HooksKind
  hooksAddress?: string
  fixedTermEndTime?: number
  depositRequiresAccess?: boolean
  queueWithdrawalRequiresAccess?: boolean
  flags?: {
    useOnDeposit?: boolean
    useOnQueueWithdrawal?: boolean
  }
}

type MarketLike = {
  controller?: string
  hooksConfig?: MarketHooksConfigLike
  onboardingMode?: MarketOnboardingMode
  roleProviders?: readonly Pick<
    RoleProvider,
    "kind" | "isApproved" | "pullProviderIndex" | "isManaged"
  >[]
}

type MarketAccountLike = {
  market: MarketLike
}

type MarketTermLike = Pick<MarketLike, "hooksConfig">

// The hooks contract stores "no pull-provider slot" as max uint24, while the
// subgraph serializes the same sentinel as -1.
const NULL_PROVIDER_INDEX = 2 ** 24 - 1

type PullRoleProviderLike = Pick<
  RoleProvider,
  "kind" | "isApproved" | "pullProviderIndex" | "isManaged"
>

const isActivePullRoleProvider = ({
  isApproved,
  pullProviderIndex,
}: PullRoleProviderLike): boolean =>
  isApproved &&
  pullProviderIndex >= 0 &&
  pullProviderIndex !== NULL_PROVIDER_INDEX

export const hasActivePullRoleProvider = (
  roleProviders: readonly PullRoleProviderLike[],
): boolean => roleProviders.some(isActivePullRoleProvider)

export const hasActiveLenderOnboardingRoleProvider = (
  roleProviders: readonly PullRoleProviderLike[],
): boolean =>
  roleProviders.some(
    (provider) =>
      // Access-list, Merkle, and explicitly managed providers can pull a
      // credential, but the lender cannot establish eligibility alone.
      isActivePullRoleProvider(provider) &&
      provider.isManaged !== true &&
      provider.kind !== "access-list" &&
      provider.kind !== "merkle",
  )

export const isHooksManagedMarket = (market: MarketLike): boolean =>
  market.hooksConfig?.hooksAddress !== undefined

export const getMarketPolicyAddress = (
  market: MarketLike,
): string | undefined => market.hooksConfig?.hooksAddress ?? market.controller

export const getFixedTermHooksConfig = (
  market: MarketTermLike,
): FixedTermHooksConfig | undefined =>
  market.hooksConfig?.kind === HooksKind.FixedTerm
    ? (market.hooksConfig as FixedTermHooksConfig)
    : undefined

export const isFixedTermMarket = (market: MarketTermLike): boolean =>
  getFixedTermHooksConfig(market) !== undefined

export const isSelfOnboardMarketAccount = (
  account: MarketAccountLike,
): boolean => {
  const { market } = account
  const { hooksConfig } = market

  if (!hooksConfig) {
    return (
      market.onboardingMode === MarketOnboardingMode.Open ||
      market.onboardingMode === MarketOnboardingMode.Self
    )
  }

  if (
    hooksConfig.depositRequiresAccess === false ||
    hooksConfig.flags?.useOnDeposit === false
  ) {
    return true
  }

  if (market.roleProviders) {
    return hasActiveLenderOnboardingRoleProvider(market.roleProviders)
  }

  return (
    market.onboardingMode === MarketOnboardingMode.Open ||
    market.onboardingMode === MarketOnboardingMode.Self
  )
}

type MarketAccessLike = {
  chainId: SupportedChainId
  hooksConfig?: MarketHooksConfigLike
  roleProviders?: readonly Pick<
    RoleProvider,
    "providerAddress" | "isApproved" | "pullProviderIndex"
  >[]
}

export type EffectiveMarketAccess = {
  depositAccess: "open" | "restricted"
  withdrawalAccess: "open" | "restricted"
}

const hasActiveOpenAccessRoleProvider = (market: MarketAccessLike): boolean => {
  const openAccessProvider = getDeploymentAddress(
    market.chainId,
    "OpenAccessRoleProvider",
  ).toLowerCase()

  return (market.roleProviders ?? []).some(
    ({ providerAddress, isApproved, pullProviderIndex }) =>
      isApproved &&
      pullProviderIndex >= 0 &&
      pullProviderIndex !== NULL_PROVIDER_INDEX &&
      providerAddress.toLowerCase() === openAccessProvider,
  )
}

export const getEffectiveMarketAccess = (
  market: MarketAccessLike,
): EffectiveMarketAccess => {
  const { hooksConfig } = market
  if (!hooksConfig) {
    return {
      depositAccess: "restricted",
      withdrawalAccess: "restricted",
    }
  }

  const depositRequiresCredential = hooksConfig.depositRequiresAccess !== false
  const withdrawalRequiresCredential =
    hooksConfig.flags?.useOnQueueWithdrawal === true &&
    (hooksConfig.kind === HooksKind.OpenTerm ||
      hooksConfig.queueWithdrawalRequiresAccess === true)
  // The open-access provider still issues a credential under the hood, but it
  // does not require borrower approval. Other role providers stay restricted.
  const hasOpenAccessProvider = hasActiveOpenAccessRoleProvider(market)

  return {
    depositAccess:
      depositRequiresCredential && !hasOpenAccessProvider
        ? "restricted"
        : "open",
    withdrawalAccess:
      withdrawalRequiresCredential && !hasOpenAccessProvider
        ? "restricted"
        : "open",
  }
}
