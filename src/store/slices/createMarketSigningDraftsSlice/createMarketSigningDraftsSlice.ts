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
  },
})

export const { saveCreateMarketSigningDraft, removeCreateMarketSigningDraft } =
  createMarketSigningDraftsSlice.actions
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
