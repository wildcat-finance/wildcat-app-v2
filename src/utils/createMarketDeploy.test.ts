/** @jest-environment node */
import {
  encodeAccessListRoleProviderDeploymentInputs,
  DeployMarketPreview,
  DeployMarketStatus,
  getDeploymentAddress,
  getHooksFactoryDeploymentAbi,
  getStandardHooksFactoryContract,
  getRevolvingHooksFactoryContract,
  SignerOrProvider,
  SupportedChainId,
  TransferAccess,
} from "@wildcatfi/wildcat-sdk"
import { decodeFunctionData, Hex, zeroAddress } from "viem"

import { getRepaymentDeploymentTerms } from "@/app/[locale]/borrower/create-market/validation/repaymentTerms"

import {
  assertWrapperDeploymentCompatible,
  canDismissCreateMarketDeployDialog,
  getCreateMarketDeployRouting,
  getCreateMarketRoleProviderInputs,
  getDeployMarketPreviewError,
  hasCreateMarketDeploymentTarget,
  previewHooksTemplateDeployment,
} from "./createMarketDeploy"

describe("createMarketDeploy", () => {
  const borrower = "0x0000000000000000000000000000000000000010"
  const salt = `${borrower}${"11".repeat(12)}`

  it.each(
    (["standard", "revolving"] as const).flatMap((kind) =>
      (["deployMarket", "deployMarketAndHooks"] as const).flatMap((fn) =>
        [false, true].map((scheduled) => ({ kind, fn, scheduled })),
      ),
    ),
  )(
    "encodes Sepolia $kind/$fn with scheduled=$scheduled for the EOA/Safe factory call",
    ({ kind, fn, scheduled }) => {
      const repaymentDate = Math.floor(Date.now() / 1000) + 86400
      const factory =
        kind === "standard"
          ? getStandardHooksFactoryContract(
              SupportedChainId.Sepolia,
              {} as SignerOrProvider,
            )
          : getRevolvingHooksFactoryContract(
              SupportedChainId.Sepolia,
              {} as SignerOrProvider,
            )
      const parameters = {
        asset: borrower,
        namePrefix: "Market",
        symbolPrefix: "M",
        maxTotalSupply: BigInt(1000),
        annualInterestBips: 1000,
        delinquencyFeeBips: 500,
        withdrawalBatchDuration: 3600,
        reserveRatioBips: 2000,
        delinquencyGracePeriod: 3600,
        hooks: BigInt(0),
        ...(scheduled
          ? getRepaymentDeploymentTerms({
              scheduleRepayment: true,
              repaymentDate,
              repaymentPeriod: 3600,
            })
          : {}),
      }
      const args = [
        ...(fn === "deployMarketAndHooks" ? [borrower, "0x"] : []),
        parameters,
        "0x",
        ...(kind === "revolving" ? ["0x"] : []),
        salt,
        zeroAddress,
        BigInt(0),
      ]
      const data = factory.interface.encodeFunctionData(fn, args) as Hex
      const decoded = decodeFunctionData({
        abi: getHooksFactoryDeploymentAbi(SupportedChainId.Sepolia, kind),
        data,
      })
      expect(decoded.functionName).toBe(fn)
      expect(decoded.args?.[fn === "deployMarket" ? 0 : 2]).toMatchObject({
        asset: borrower,
        repaymentDate: scheduled ? repaymentDate : 0,
        repaymentPeriod: scheduled ? 3600 : 0,
      })
    },
  )

  it("creates one borrower-administered access list for a fresh v2.5 policy", () => {
    expect(
      getCreateMarketRoleProviderInputs({
        accessControl: "manualApproval",
        borrower,
        chainId: SupportedChainId.Sepolia,
        hasExistingHooks: false,
        salt,
      }),
    ).toEqual({
      existingProviders: [],
      newProviderInputs: [
        {
          data: encodeAccessListRoleProviderDeploymentInputs({
            administrator: borrower,
            initialMembers: [],
            salt,
          }),
          timeToLive: 0,
        },
      ],
      roleProviderFactory: getDeploymentAddress(
        SupportedChainId.Sepolia,
        "AccessListRoleProviderFactory",
      ),
    })
  })

  it("keeps the pre-v2.5 borrower-provider constructor behavior", () => {
    expect(
      getCreateMarketRoleProviderInputs({
        accessControl: "manualApproval",
        borrower,
        chainId: SupportedChainId.Mainnet,
        hasExistingHooks: false,
        salt,
      }),
    ).toEqual({
      existingProviders: [],
      newProviderInputs: [],
      roleProviderFactory: zeroAddress,
    })
  })

  it("attaches the existing open-access provider for self-onboarding", () => {
    expect(
      getCreateMarketRoleProviderInputs({
        accessControl: "defaultPullProvider",
        borrower,
        chainId: SupportedChainId.Sepolia,
        hasExistingHooks: false,
        salt,
      }),
    ).toEqual({
      existingProviders: [
        {
          providerAddress: getDeploymentAddress(
            SupportedChainId.Sepolia,
            "OpenAccessRoleProvider",
          ),
          timeToLive: 90 * 86_400,
        },
      ],
      newProviderInputs: [],
      roleProviderFactory: zeroAddress,
    })
  })

  it("does not mutate provider attachments when reusing existing hooks", () => {
    expect(
      getCreateMarketRoleProviderInputs({
        accessControl: "manualApproval",
        borrower,
        chainId: SupportedChainId.Sepolia,
        hasExistingHooks: true,
        salt,
      }),
    ).toEqual({})
  })

  it.each([
    { isDeploying: false, isSuccess: false, expected: true },
    { isDeploying: true, isSuccess: false, expected: false },
    { isDeploying: false, isSuccess: true, expected: false },
  ])(
    "returns $expected for dialog dismissal with deploying=$isDeploying and success=$isSuccess",
    ({ isDeploying, isSuccess, expected }) => {
      expect(
        canDismissCreateMarketDeployDialog({ isDeploying, isSuccess }),
      ).toBe(expected)
    },
  )

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
      DeployMarketStatus.InvalidRepaymentTerms,
      "The repayment date and period are invalid",
    ],
    [
      DeployMarketStatus.RepaymentTermsUnsupported,
      "Scheduled repayment is not supported by this deployment target",
    ],
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
