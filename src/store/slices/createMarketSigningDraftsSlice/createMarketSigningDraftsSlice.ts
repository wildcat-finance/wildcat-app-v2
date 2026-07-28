import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { createMigrate, persistReducer } from "redux-persist"
import type { PersistedState } from "redux-persist"
import storage from "redux-persist/lib/storage"

import { MarketValidationSchemaType } from "@/app/[locale]/borrower/create-market/validation/validationSchema"
import { BorrowerProfile } from "@/app/api/profiles/interface"
import { SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS } from "@/utils/serviceAgreementMessage"

export type CreateMarketAssetSnapshot = {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  isMock: boolean
}

export type CreateMarketDeploymentIdentity = {
  predictedMarket: string
  marketKind: MarketValidationSchemaType["implementationType"]
  marketType: string
  hooksKind: string
  hooksFactory: string
  hooksTemplate: string
  hooksTemplateRegistrationId?: string
  hooksTemplateRegistrationRevision?: string
  hooksInstance?: string
  mlaTemplate: string
}

export type CreateMarketSigningDraft = {
  version: 2
  walletKind: "Safe"
  id: string
  chainId: number
  address: string
  salt: string
  timeSigned: number
  formValues: MarketValidationSchemaType
  borrowerProfile: BorrowerProfile
  asset: CreateMarketAssetSnapshot
  deploymentIdentity: CreateMarketDeploymentIdentity
  createdAt: number
  // Set once the market for `salt` is deployed on chain. This lets a resumed
  // draft skip re-deploying and retry only the agreement upload.
  deployedMarket?: string
}

export type CreateMarketSigningDraftsState = {
  records: Record<string, CreateMarketSigningDraft>
}

export type CreateMarketDeploymentIdentityInput = {
  formValues: MarketValidationSchemaType
  predictedMarket: string
  hooksTemplate: {
    hooksFactory: string
    hooksTemplate: string
    kind: string
    registration?: {
      id: string
      updatedAt?: {
        blockNumber: bigint | number | string
        transactionHash?: string
        logIndex?: bigint | number | string
      }
    }
  }
  hooksInstanceAddress?: string
}

const normalizeAddress = (address: string) => address.toLowerCase()

const getRegistrationRevision = (
  registration: CreateMarketDeploymentIdentityInput["hooksTemplate"]["registration"],
) =>
  registration?.updatedAt
    ? [
        registration.updatedAt.blockNumber.toString(),
        registration.updatedAt.transactionHash?.toLowerCase() ?? "",
        registration.updatedAt.logIndex?.toString() ?? "",
      ].join(":")
    : undefined

export const getCreateMarketDeploymentIdentity = ({
  formValues,
  predictedMarket,
  hooksTemplate,
  hooksInstanceAddress,
}: CreateMarketDeploymentIdentityInput): CreateMarketDeploymentIdentity => ({
  predictedMarket: normalizeAddress(predictedMarket),
  marketKind: formValues.implementationType,
  marketType: formValues.marketType,
  hooksKind: hooksTemplate.kind,
  hooksFactory: normalizeAddress(hooksTemplate.hooksFactory),
  hooksTemplate: normalizeAddress(hooksTemplate.hooksTemplate),
  hooksTemplateRegistrationId: hooksTemplate.registration?.id,
  hooksTemplateRegistrationRevision: getRegistrationRevision(
    hooksTemplate.registration,
  ),
  hooksInstance: hooksInstanceAddress
    ? normalizeAddress(hooksInstanceAddress)
    : undefined,
  mlaTemplate: formValues.mla ?? "noMLA",
})

const DISPLAY_ONLY_FORM_FIELDS = new Set<keyof MarketValidationSchemaType>([
  "periodicDurationUnit",
])

export const haveSameCreateMarketFormValues = (
  first: MarketValidationSchemaType,
  second: MarketValidationSchemaType,
) => {
  const keys = new Set([
    ...Object.keys(first),
    ...Object.keys(second),
  ] as (keyof MarketValidationSchemaType)[])

  return Array.from(keys).every(
    (key) => DISPLAY_ONLY_FORM_FIELDS.has(key) || first[key] === second[key],
  )
}

export const haveSameCreateMarketAsset = (
  first: CreateMarketAssetSnapshot,
  second: CreateMarketAssetSnapshot,
) =>
  first.chainId === second.chainId &&
  normalizeAddress(first.address) === normalizeAddress(second.address) &&
  first.name === second.name &&
  first.symbol === second.symbol &&
  first.decimals === second.decimals &&
  first.isMock === second.isMock

export const isCreateMarketDraftCompatible = ({
  draft,
  formValues,
  asset,
  deploymentIdentity,
  address,
  chainId,
}: {
  draft: CreateMarketSigningDraft
  formValues: MarketValidationSchemaType
  asset: CreateMarketAssetSnapshot
  deploymentIdentity: CreateMarketDeploymentIdentity
  address: string
  chainId: number
}) =>
  draft.version === 2 &&
  draft.walletKind === "Safe" &&
  draft.chainId === chainId &&
  normalizeAddress(draft.address) === normalizeAddress(address) &&
  haveSameCreateMarketFormValues(draft.formValues, formValues) &&
  haveSameCreateMarketAsset(draft.asset, asset) &&
  Object.entries(draft.deploymentIdentity).every(
    ([key, value]) =>
      (!!draft.deployedMarket && key === "hooksTemplateRegistrationRevision") ||
      deploymentIdentity[key as keyof CreateMarketDeploymentIdentity] === value,
  ) &&
  Object.entries(deploymentIdentity).every(
    ([key, value]) =>
      (!!draft.deployedMarket && key === "hooksTemplateRegistrationRevision") ||
      draft.deploymentIdentity[key as keyof CreateMarketDeploymentIdentity] ===
        value,
  )

export const getReusableCreateMarketDraftDeployment = ({
  draft,
  salt,
  marketKind,
  hooksTemplate,
}: {
  draft: CreateMarketSigningDraft | undefined
  salt: string
  marketKind: MarketValidationSchemaType["implementationType"]
  hooksTemplate: string
}) =>
  draft?.version === 2 &&
  draft.salt === salt &&
  draft.deploymentIdentity.marketKind === marketKind &&
  draft.deploymentIdentity.hooksTemplate === normalizeAddress(hooksTemplate) &&
  !!draft.deployedMarket &&
  normalizeAddress(draft.deployedMarket) ===
    draft.deploymentIdentity.predictedMarket
    ? draft.deployedMarket
    : undefined

export const getCreateMarketSigningDraftScope = (
  address: string,
  chainId: number,
) => `${chainId}:${address.toLowerCase()}`

export const isCreateMarketSigningDraftExpired = (
  draft: Pick<CreateMarketSigningDraft, "timeSigned">,
  now = Date.now(),
) => now >= draft.timeSigned + SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS

const initialState: CreateMarketSigningDraftsState = { records: {} }

const createMarketSigningDraftsSlice = createSlice({
  name: "createMarketSigningDrafts",
  initialState,
  reducers: {
    saveCreateMarketSigningDraft: (
      state,
      action: PayloadAction<CreateMarketSigningDraft>,
    ) => {
      state.records[
        getCreateMarketSigningDraftScope(
          action.payload.address,
          action.payload.chainId,
        )
      ] = action.payload
    },
    removeCreateMarketSigningDraft: (
      state,
      action: PayloadAction<{ address: string; chainId: number; id: string }>,
    ) => {
      const scope = getCreateMarketSigningDraftScope(
        action.payload.address,
        action.payload.chainId,
      )
      if (state.records[scope]?.id !== action.payload.id) return
      delete state.records[scope]
    },
    // The salt guard prevents a late deployment result from attaching to a
    // replacement draft created while the transaction was in flight.
    markCreateMarketDraftDeployed: (
      state,
      action: PayloadAction<{
        address: string
        chainId: number
        salt: string
        deployedMarket: string
      }>,
    ) => {
      const record =
        state.records[
          getCreateMarketSigningDraftScope(
            action.payload.address,
            action.payload.chainId,
          )
        ]
      if (
        !record ||
        record.salt !== action.payload.salt ||
        normalizeAddress(action.payload.deployedMarket) !==
          record.deploymentIdentity.predictedMarket
      ) {
        return
      }
      record.deployedMarket = action.payload.deployedMarket
    },
  },
})

export const {
  saveCreateMarketSigningDraft,
  removeCreateMarketSigningDraft,
  markCreateMarketDraftDeployed,
} = createMarketSigningDraftsSlice.actions
export const createMarketSigningDraftsReducer =
  createMarketSigningDraftsSlice.reducer

// Version-1 drafts predate V2.5 market-kind, factory, template, and periodic
// identity. They cannot safely resume, so the browser-local state is discarded
// at the persistence boundary rather than heuristically upgraded.
export const discardLegacyCreateMarketSigningDrafts = (
  state: PersistedState,
): PersistedState =>
  state
    ? ({
        ...initialState,
        // eslint-disable-next-line no-underscore-dangle
        _persist: state._persist,
      } as unknown as PersistedState)
    : state

export default persistReducer(
  {
    key: "createMarketSigningDrafts",
    storage,
    version: 2,
    migrate: createMigrate(
      {
        2: discardLegacyCreateMarketSigningDrafts,
      },
      { debug: false },
    ),
  },
  createMarketSigningDraftsSlice.reducer,
)
