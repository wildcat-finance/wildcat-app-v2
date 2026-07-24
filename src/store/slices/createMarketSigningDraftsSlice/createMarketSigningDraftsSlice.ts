import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { persistReducer } from "redux-persist"
import storage from "redux-persist/lib/storage"

import { MarketValidationSchemaType } from "@/app/[locale]/borrower/create-market/validation/validationSchema"
import { BorrowerProfile } from "@/app/api/profiles/interface"

export type CreateMarketAssetSnapshot = {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  isMock: boolean
}

export type CreateMarketSigningDraft = {
  version: 1
  walletKind: "Safe"
  id: string
  chainId: number
  address: string
  salt: string
  timeSigned: number
  formValues: MarketValidationSchemaType
  borrowerProfile: BorrowerProfile
  asset: CreateMarketAssetSnapshot
  createdAt: number
  // Set once the market for `salt` is deployed on chain. Lets a resumed
  // draft skip re-deploying (the CREATE2 address is already taken) and go
  // straight to retrying the MLA upload.
  deployedMarket?: string
}

export type CreateMarketSigningDraftsState = {
  records: Record<string, CreateMarketSigningDraft>
}

const initialState: CreateMarketSigningDraftsState = { records: {} }

export const getCreateMarketSigningDraftScope = (
  address: string,
  chainId: number,
) => `${chainId}:${address.toLowerCase()}`

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
      action: PayloadAction<{ address: string; chainId: number }>,
    ) => {
      delete state.records[
        getCreateMarketSigningDraftScope(
          action.payload.address,
          action.payload.chainId,
        )
      ]
    },
    // Records the deployed market on the draft it belongs to. The salt guard
    // means a deploy result can never attach to a draft that was discarded
    // and re-created (new salt) while the transaction was in flight.
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
      if (!record || record.salt !== action.payload.salt) return
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

export default persistReducer(
  {
    key: "createMarketSigningDrafts",
    storage,
    version: 1,
  },
  createMarketSigningDraftsReducer,
)
