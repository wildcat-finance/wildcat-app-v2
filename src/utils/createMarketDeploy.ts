import {
  DeployableMarketKind,
  DeployMarketPreview,
  DeployMarketStatus,
  TransferAccess,
} from "@wildcatfi/wildcat-sdk"

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
