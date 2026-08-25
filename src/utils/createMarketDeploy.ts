import {
  encodeAccessListRoleProviderDeploymentInputs,
  DeployableMarketKind,
  DeployMarketPreview,
  DeployMarketStatus,
  getDeploymentAddress,
  hasDeploymentAddress,
  SupportedChainId,
  TransferAccess,
} from "@wildcatfi/wildcat-sdk"
import { zeroAddress } from "viem"

export const WRAPPER_TRANSFERS_DISABLED_ERROR =
  "A wrapper cannot be deployed when market transfers are disabled"

export const assertWrapperDeploymentCompatible = (
  deployWrapper: boolean | undefined,
  transferAccess: TransferAccess,
) => {
  if (deployWrapper && transferAccess === TransferAccess.Disabled) {
    throw new Error(WRAPPER_TRANSFERS_DISABLED_ERROR)
  }
}

type CreateMarketDeployRoutingInput = {
  implementationType: DeployableMarketKind
  commitmentFeePercent?: number
}

type CreateMarketDeployRoutingOutput =
  | {
      marketKind: "standard"
      commitmentFeeBips?: undefined
    }
  | {
      marketKind: "revolving"
      commitmentFeeBips: number
    }

type CreateMarketDeploymentTargetInput = {
  hasSelectedHooksTemplate: boolean
  hasCommittedDeployment: boolean
}

type CreateMarketRoleProviderInputs = {
  existingProviders?: Array<{
    providerAddress: string
    timeToLive: number
  }>
  newProviderInputs?: Array<{
    data: string
    timeToLive: number
  }>
  roleProviderFactory?: string
}

type CreateMarketRoleProviderInput = {
  accessControl: string
  borrower: string
  chainId: SupportedChainId
  hasExistingHooks: boolean
  salt: string
}

/**
 * Keeps legacy deployments unchanged while giving fresh v2.5 borrower-operated
 * policies their own managed allowlist. Provider creation happens inside the
 * existing deployMarketAndHooks transaction.
 */
export const getCreateMarketRoleProviderInputs = ({
  accessControl,
  borrower,
  chainId,
  hasExistingHooks,
  salt,
}: CreateMarketRoleProviderInput): CreateMarketRoleProviderInputs => {
  if (hasExistingHooks) return {}

  if (accessControl === "defaultPullProvider") {
    return {
      existingProviders: [
        {
          providerAddress: getDeploymentAddress(
            chainId,
            "OpenAccessRoleProvider",
          ),
          timeToLive: 90 * 86_400,
        },
      ],
      newProviderInputs: [],
      roleProviderFactory: zeroAddress,
    }
  }

  if (accessControl !== "manualApproval") {
    throw Error(`Unsupported access-control selection: ${accessControl}`)
  }

  if (!hasDeploymentAddress(chainId, "AccessListRoleProviderFactory")) {
    // Pre-v2.5 hooks add the borrower as a push provider during construction.
    return {
      existingProviders: [],
      newProviderInputs: [],
      roleProviderFactory: zeroAddress,
    }
  }

  return {
    existingProviders: [],
    newProviderInputs: [
      {
        data: encodeAccessListRoleProviderDeploymentInputs({
          administrator: borrower,
          initialMembers: [],
          salt,
        }),
        // Keep mutable allowlist removals effective on the next gated action.
        timeToLive: 0,
      },
    ],
    roleProviderFactory: getDeploymentAddress(
      chainId,
      "AccessListRoleProviderFactory",
    ),
  }
}

export const hasCreateMarketDeploymentTarget = ({
  hasSelectedHooksTemplate,
  hasCommittedDeployment,
}: CreateMarketDeploymentTargetInput) =>
  hasSelectedHooksTemplate || hasCommittedDeployment

export const canDismissCreateMarketDeployDialog = ({
  isDeploying,
  isSuccess,
}: {
  isDeploying: boolean
  isSuccess: boolean
}) => !isDeploying && !isSuccess

type HooksTemplateDeploymentPreviewer = {
  previewDeployMarket(params: never): DeployMarketPreview
}

// The template classes expose different overloaded parameter types, but every
// preview reads deployment authority from its instance. Keep the member call
// intact so the SDK receives the template as `this`.
export const previewHooksTemplateDeployment = (
  hooksTemplate: HooksTemplateDeploymentPreviewer,
  params: unknown,
) => hooksTemplate.previewDeployMarket(params as never)

export const getCreateMarketDeployRouting = ({
  implementationType,
  commitmentFeePercent,
}: CreateMarketDeployRoutingInput): CreateMarketDeployRoutingOutput => {
  if (implementationType === "standard") {
    return {
      marketKind: "standard",
    }
  }

  if (commitmentFeePercent === undefined) {
    throw new Error("Commitment fee percent is required for revolving markets")
  }

  return {
    marketKind: "revolving",
    commitmentFeeBips: Math.round(commitmentFeePercent * 100),
  }
}

export const getDeployMarketPreviewError = (
  status: Exclude<DeployMarketStatus, DeployMarketStatus.Ready>,
) => {
  if (status === DeployMarketStatus.InvalidAccessConfiguration) {
    return "Restricted withdrawals require restricted deposits and restricted or disabled transfers"
  }
  if (status === DeployMarketStatus.MinimumDepositTooHigh) {
    return "Minimum deposit is too large for this periodic market"
  }
  if (status === DeployMarketStatus.HooksTemplateRegistrationUnavailable) {
    return "The selected hooks template is missing indexed registration metadata"
  }
  if (status === DeployMarketStatus.HooksTemplateDisabled) {
    return "The selected hooks template is disabled"
  }
  if (
    status === DeployMarketStatus.WrongHooksFactory ||
    status === DeployMarketStatus.HooksFactoryNotDeploymentTarget
  ) {
    return "The selected policy cannot deploy this market implementation"
  }
  if (
    status === DeployMarketStatus.HooksFactoryRegistrationUnknown ||
    status === DeployMarketStatus.HooksFactoryNotRegistered
  ) {
    return "The selected hooks factory is not currently registered"
  }
  return `Market is not ready for deployment: ${status}`
}
