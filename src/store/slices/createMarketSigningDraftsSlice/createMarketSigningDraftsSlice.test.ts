import { SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS } from "@/utils/serviceAgreementMessage"

import {
  CreateMarketSigningDraft,
  createMarketSigningDraftsReducer,
  discardLegacyCreateMarketSigningDrafts,
  getCreateMarketDeploymentIdentity,
  getCreateMarketSigningDraftScope,
  getReusableCreateMarketDraftDeployment,
  haveSameCreateMarketFormValues,
  isCreateMarketDraftCompatible,
  isCreateMarketSigningDraftExpired,
  markCreateMarketDraftDeployed,
  removeCreateMarketSigningDraft,
  saveCreateMarketSigningDraft,
} from "./createMarketSigningDraftsSlice"

const formValues = {
  implementationType: "revolving" as const,
  marketName: "Test market",
  mla: "12",
  accessControl: "manualApproval",
  marketType: "periodicTerm",
  asset: "0x0000000000000000000000000000000000000001",
  namePrefix: "Test ",
  symbolPrefix: "t",
  maxTotalSupply: 1_000_000,
  annualInterestBips: 10,
  delinquencyFeeBips: 2,
  reserveRatioBips: 20,
  commitmentFeePercent: 1,
  minimumDeposit: 100,
  delinquencyGracePeriod: 24,
  withdrawalBatchDuration: 24,
  policy: "createNewPolicy",
  policyName: "Periodic policy",
  firstWithdrawalWindowStart: 1_800_000_000,
  periodDuration: 2_592_000,
  withdrawalWindowDuration: 604_800,
  periodicDurationUnit: "Days" as const,
  disableTransfers: false,
  transferRequiresAccess: true,
  depositRequiresAccess: true,
  withdrawalRequiresAccess: true,
  deployWrapper: false,
}

const asset = {
  chainId: 1,
  address: formValues.asset,
  name: "USD Coin",
  symbol: "USDC",
  decimals: 6,
  isMock: false,
}

const deploymentIdentity = getCreateMarketDeploymentIdentity({
  formValues,
  predictedMarket: "0x0000000000000000000000000000000000000002",
  hooksTemplate: {
    hooksFactory: "0x0000000000000000000000000000000000000003",
    hooksTemplate: "0x0000000000000000000000000000000000000004",
    kind: "PeriodicTerm",
    registration: {
      id: "factory:template",
      updatedAt: {
        blockNumber: 123,
        transactionHash:
          "0x0000000000000000000000000000000000000000000000000000000000000009",
        logIndex: 1,
      },
    },
  },
})

const draft: CreateMarketSigningDraft = {
  version: 2,
  walletKind: "Safe",
  id: "draft-1",
  chainId: 1,
  address: "0x0000000000000000000000000000000000000005",
  salt: "0xsalt",
  timeSigned: 123,
  formValues,
  borrowerProfile: {
    chainId: 1,
    address: "0x0000000000000000000000000000000000000005",
    registeredOnChain: true,
  },
  asset,
  deploymentIdentity,
  createdAt: 456,
}

describe("createMarketSigningDraftsSlice", () => {
  it("scopes drafts by normalized wallet and chain", () => {
    expect(getCreateMarketSigningDraftScope("0xABC", 1)).toBe("1:0xabc")
    expect(getCreateMarketSigningDraftScope("0xABC", 11155111)).toBe(
      "11155111:0xabc",
    )
  })

  it("saves, replaces, and removes only the matching scoped draft", () => {
    let state = createMarketSigningDraftsReducer(
      undefined,
      saveCreateMarketSigningDraft(draft),
    )
    expect(
      state.records[getCreateMarketSigningDraftScope(draft.address, 1)],
    ).toEqual(draft)

    state = createMarketSigningDraftsReducer(
      state,
      saveCreateMarketSigningDraft({ ...draft, id: "draft-2" }),
    )
    expect(
      state.records[getCreateMarketSigningDraftScope(draft.address, 1)].id,
    ).toBe("draft-2")

    state = createMarketSigningDraftsReducer(
      state,
      removeCreateMarketSigningDraft({
        address: draft.address,
        chainId: 1,
        id: draft.id,
      }),
    )
    expect(
      state.records[getCreateMarketSigningDraftScope(draft.address, 1)].id,
    ).toBe("draft-2")

    state = createMarketSigningDraftsReducer(
      state,
      removeCreateMarketSigningDraft({
        address: draft.address,
        chainId: 1,
        id: "draft-2",
      }),
    )
    expect(state.records).toEqual({})
  })

  it("expires at the service-agreement signing boundary", () => {
    expect(
      isCreateMarketSigningDraftExpired(
        draft,
        draft.timeSigned + SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS - 1,
      ),
    ).toBe(false)
    expect(
      isCreateMarketSigningDraftExpired(
        draft,
        draft.timeSigned + SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS,
      ),
    ).toBe(true)
  })

  it("records deployment only for the matching salt", () => {
    let state = createMarketSigningDraftsReducer(
      undefined,
      saveCreateMarketSigningDraft(draft),
    )
    const scope = getCreateMarketSigningDraftScope(draft.address, 1)

    state = createMarketSigningDraftsReducer(
      state,
      markCreateMarketDraftDeployed({
        address: draft.address,
        chainId: 1,
        salt: "0xrotated",
        deployedMarket: deploymentIdentity.predictedMarket,
      }),
    )
    expect(state.records[scope].deployedMarket).toBeUndefined()

    state = createMarketSigningDraftsReducer(
      state,
      markCreateMarketDraftDeployed({
        address: draft.address,
        chainId: 1,
        salt: draft.salt,
        deployedMarket: "0xwrong",
      }),
    )
    expect(state.records[scope].deployedMarket).toBeUndefined()

    state = createMarketSigningDraftsReducer(
      state,
      markCreateMarketDraftDeployed({
        address: draft.address,
        chainId: 1,
        salt: draft.salt,
        deployedMarket: deploymentIdentity.predictedMarket,
      }),
    )
    expect(state.records[scope].deployedMarket).toBe(
      deploymentIdentity.predictedMarket,
    )
  })

  it("reuses a persisted deployment only for the same ceremony", () => {
    const deployedDraft = {
      ...draft,
      deployedMarket: deploymentIdentity.predictedMarket,
    }

    expect(
      getReusableCreateMarketDraftDeployment({
        draft: deployedDraft,
        salt: draft.salt,
        marketKind: draft.deploymentIdentity.marketKind,
        hooksTemplate: draft.deploymentIdentity.hooksTemplate,
      }),
    ).toBe(deploymentIdentity.predictedMarket)
    expect(
      getReusableCreateMarketDraftDeployment({
        draft: deployedDraft,
        salt: "0xother",
        marketKind: draft.deploymentIdentity.marketKind,
        hooksTemplate: draft.deploymentIdentity.hooksTemplate,
      }),
    ).toBeUndefined()
    expect(
      getReusableCreateMarketDraftDeployment({
        draft: deployedDraft,
        salt: draft.salt,
        marketKind: "standard",
        hooksTemplate: draft.deploymentIdentity.hooksTemplate,
      }),
    ).toBeUndefined()
    expect(
      getReusableCreateMarketDraftDeployment({
        draft: deployedDraft,
        salt: draft.salt,
        marketKind: draft.deploymentIdentity.marketKind,
        hooksTemplate: "0x0000000000000000000000000000000000000008",
      }),
    ).toBeUndefined()
  })

  it("ignores display-only periodic units but invalidates deployment inputs", () => {
    expect(
      haveSameCreateMarketFormValues(formValues, {
        ...formValues,
        periodicDurationUnit: "Hours",
      }),
    ).toBe(true)
    expect(
      isCreateMarketDraftCompatible({
        draft,
        formValues: { ...formValues, periodicDurationUnit: "Hours" },
        asset,
        deploymentIdentity,
        address: draft.address,
        chainId: draft.chainId,
      }),
    ).toBe(true)

    expect(
      isCreateMarketDraftCompatible({
        draft,
        formValues: { ...formValues, commitmentFeePercent: 2 },
        asset,
        deploymentIdentity,
        address: draft.address,
        chainId: draft.chainId,
      }),
    ).toBe(false)

    expect(
      isCreateMarketDraftCompatible({
        draft,
        formValues,
        asset,
        deploymentIdentity: {
          ...deploymentIdentity,
          hooksFactory: "0x0000000000000000000000000000000000000006",
        },
        address: draft.address,
        chainId: draft.chainId,
      }),
    ).toBe(false)

    expect(
      isCreateMarketDraftCompatible({
        draft,
        formValues,
        asset,
        deploymentIdentity: {
          ...deploymentIdentity,
          hooksTemplateRegistrationRevision: "124:0xchanged:0",
        },
        address: draft.address,
        chainId: draft.chainId,
      }),
    ).toBe(false)

    expect(
      isCreateMarketDraftCompatible({
        draft: {
          ...draft,
          deployedMarket: deploymentIdentity.predictedMarket,
        },
        formValues,
        asset,
        deploymentIdentity: {
          ...deploymentIdentity,
          hooksTemplateRegistrationRevision: "124:0xchanged:0",
        },
        address: draft.address,
        chainId: draft.chainId,
      }),
    ).toBe(true)
  })

  it("invalidates asset and predicted-market changes", () => {
    expect(
      isCreateMarketDraftCompatible({
        draft,
        formValues,
        asset: { ...asset, decimals: 18 },
        deploymentIdentity,
        address: draft.address,
        chainId: draft.chainId,
      }),
    ).toBe(false)
    expect(
      isCreateMarketDraftCompatible({
        draft,
        formValues,
        asset,
        deploymentIdentity: {
          ...deploymentIdentity,
          predictedMarket: "0x0000000000000000000000000000000000000007",
        },
        address: draft.address,
        chainId: draft.chainId,
      }),
    ).toBe(false)
  })

  it("never reuses a draft across wallet or chain scope", () => {
    expect(
      isCreateMarketDraftCompatible({
        draft,
        formValues,
        asset,
        deploymentIdentity,
        address: "0x0000000000000000000000000000000000000006",
        chainId: draft.chainId,
      }),
    ).toBe(false)
    expect(
      isCreateMarketDraftCompatible({
        draft,
        formValues,
        asset,
        deploymentIdentity,
        address: draft.address,
        chainId: 11155111,
      }),
    ).toBe(false)
  })

  it("discards all version-1 persisted drafts at the V2.5 boundary", () => {
    expect(
      discardLegacyCreateMarketSigningDrafts({
        _persist: { version: 1, rehydrated: true },
      }),
    ).toEqual({
      records: {},
      _persist: { version: 1, rehydrated: true },
    })
  })
})
