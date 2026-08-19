import {
  DeployMarketPreview,
  DeployMarketStatus,
  TransferAccess,
} from "@wildcatfi/wildcat-sdk"

import {
  assertWrapperDeploymentCompatible,
  getCreateMarketDeployRouting,
  getDeployMarketPreviewError,
  hasCreateMarketDeploymentTarget,
  previewHooksTemplateDeployment,
} from "./createMarketDeploy"

describe("createMarketDeploy", () => {
  it("preserves the SDK template receiver when previewing deployment", () => {
    const hooksTemplate = {
      enabled: true,
      previewDeployMarket(): DeployMarketPreview {
        return {
          status: this.enabled
            ? DeployMarketStatus.HooksFactoryNotRegistered
            : DeployMarketStatus.HooksTemplateDisabled,
        }
      },
    }

    expect(previewHooksTemplateDeployment(hooksTemplate, {})).toEqual({
      status: DeployMarketStatus.HooksFactoryNotRegistered,
    })
  })

  it("requires a selected template unless deployment is already committed", () => {
    expect(
      hasCreateMarketDeploymentTarget({
        hasSelectedHooksTemplate: false,
        hasCommittedDeployment: false,
      }),
    ).toBe(false)
    expect(
      hasCreateMarketDeploymentTarget({
        hasSelectedHooksTemplate: true,
        hasCommittedDeployment: false,
      }),
    ).toBe(true)
    expect(
      hasCreateMarketDeploymentTarget({
        hasSelectedHooksTemplate: false,
        hasCommittedDeployment: true,
      }),
    ).toBe(true)
  })

  it("routes standard markets without commitment fee", () => {
    expect(
      getCreateMarketDeployRouting({
        implementationType: "standard",
      }),
    ).toEqual({
      marketKind: "standard",
    })
  })

  it("routes revolving markets and converts percent to bips", () => {
    expect(
      getCreateMarketDeployRouting({
        implementationType: "revolving",
        commitmentFeePercent: 2.5,
      }),
    ).toEqual({
      marketKind: "revolving",
      commitmentFeeBips: 250,
    })
  })

  it("requires commitment fee percent for revolving markets", () => {
    expect(() =>
      getCreateMarketDeployRouting({
        implementationType: "revolving",
      }),
    ).toThrow("Commitment fee percent is required for revolving markets")
  })

  it("rejects wrapper deployment for a transfer-disabled market", () => {
    expect(() =>
      assertWrapperDeploymentCompatible(true, TransferAccess.Disabled),
    ).toThrow("A wrapper cannot be deployed when market transfers are disabled")

    expect(() =>
      assertWrapperDeploymentCompatible(false, TransferAccess.Disabled),
    ).not.toThrow()
    expect(() =>
      assertWrapperDeploymentCompatible(true, TransferAccess.Open),
    ).not.toThrow()
  })

  it.each<[Exclude<DeployMarketStatus, DeployMarketStatus.Ready>, string]>([
    [
      DeployMarketStatus.InvalidAccessConfiguration,
      "Restricted withdrawals require restricted deposits and restricted or disabled transfers",
    ],
    [
      DeployMarketStatus.MinimumDepositTooHigh,
      "Minimum deposit is too large for this periodic market",
    ],
    [
      DeployMarketStatus.WrongHooksFactory,
      "The selected policy cannot deploy this market implementation",
    ],
    [
      DeployMarketStatus.HooksTemplateRegistrationUnavailable,
      "The selected hooks template is missing indexed registration metadata",
    ],
  ])("describes rejected SDK deployment previews", (status, expected) => {
    expect(getDeployMarketPreviewError(status)).toBe(expected)
  })
})
