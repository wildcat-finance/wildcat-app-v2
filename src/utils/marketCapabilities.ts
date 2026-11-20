import {
  FixedTermHooksConfig,
  getDeploymentAddress,
  hasDeploymentAddress,
  HooksKind,
  MarketOnboardingMode,
  type HooksCredential,
  type Market,
  type RoleProvider,
  type SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import { zeroAddress } from "viem"

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

export const isCheckedOnUseCredential = (credential?: HooksCredential) => {
  const provider = credential?.lastProvider
  return (
    !!provider &&
    provider.timeToLive === 0 &&
    isActivePullRoleProvider(provider) &&
    provider.providerAddress !== zeroAddress
  )
}

export const getProviderLabelKey = (
  chainId: SupportedChainId,
  address: string,
  kind?: RoleProvider["kind"],
) => {
  if (
    kind === "kyc" ||
    (hasDeploymentAddress(chainId, "KYCRoleProvider") &&
      getDeploymentAddress(chainId, "KYCRoleProvider").toLowerCase() ===
        address.toLowerCase())
  )
    return "marketParameters.roleProviders.sharedKyc"
  if (
    hasDeploymentAddress(chainId, "OpenAccessRoleProvider") &&
    getDeploymentAddress(chainId, "OpenAccessRoleProvider").toLowerCase() ===
      address.toLowerCase()
  )
    return "common.kyc.openAccess"
  if (kind === "access-list") return "common.kyc.allowlist"
  return undefined
}

export const hasActivePullRoleProvider = (
  roleProviders: readonly PullRoleProviderLike[],
): boolean => roleProviders.some(isActivePullRoleProvider)

export const hasActiveLenderOnboardingRoleProvider = (
  roleProviders: readonly PullRoleProviderLike[],
): boolean =>
  roleProviders.some(
    (provider) =>
      // Managed lists and Merkle providers can pull a
      // credential, but the lender cannot establish eligibility alone.
      isActivePullRoleProvider(provider) &&
      provider.isManaged !== true &&
      provider.kind !== "access-list" &&
      provider.kind !== "kyc" &&
      provider.kind !== "merkle",
  )

export const hasActiveKycProvider = (
  providers: readonly PullRoleProviderLike[] = [],
) =>
  providers.some(
    (provider) => provider.kind === "kyc" && isActivePullRoleProvider(provider),
  )

// A live lens identifies attachments and their administrators, but only the index knows
// the kind of a borrower AccessList. Join metadata by address so a detached list cannot qualify.
export const hasBorrowerAccessPath = (
  market: Pick<Market, "borrower" | "roleProviders">,
  indexedProviders?: readonly RoleProvider[],
) =>
  market.roleProviders?.some((provider) => {
    if (!provider.isApproved) return false
    const address = provider.providerAddress.toLowerCase()
    const borrower = market.borrower.toLowerCase()
    if (provider.isPushProvider && address === borrower) return true
    const indexed = indexedProviders?.find(
      (item) => item.providerAddress.toLowerCase() === address,
    )
    const kind =
      !provider.kind || provider.kind === "unknown"
        ? indexed?.kind
        : provider.kind
    const administrator = provider.administrator ?? indexed?.administrator
    return kind === "access-list" && administrator?.toLowerCase() === borrower
  }) ?? false

export const getPolicyAccessControl = (
  providers: readonly PullRoleProviderLike[],
) => {
  if (hasActiveLenderOnboardingRoleProvider(providers))
    return "defaultPullProvider"
  return hasActiveKycProvider(providers) ? "sharedKyc" : "manualApproval"
}

export const getPolicyLenderNoticeKey = (
  providers: readonly PullRoleProviderLike[] = [],
) => {
  if (hasActiveKycProvider(providers))
    return "borrower.policies.lenders.kycNotice"
  if (hasActiveLenderOnboardingRoleProvider(providers))
    return "borrower.policies.lenders.selfOnboardNotice"
  return "borrower.policies.lenders.notEditableNotice"
}

export const acceptsKycForDeposit = (market?: MarketLike) =>
  !!market?.hooksConfig?.flags?.useOnDeposit &&
  !!market.hooksConfig.depositRequiresAccess &&
  hasActiveKycProvider(market.roleProviders)

export const acceptsKycForWithdrawal = (market: MarketLike) =>
  !!market.hooksConfig?.flags?.useOnQueueWithdrawal &&
  (market.hooksConfig.kind === HooksKind.OpenTerm ||
    !!market.hooksConfig.queueWithdrawalRequiresAccess) &&
  hasActiveKycProvider(market.roleProviders)

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
