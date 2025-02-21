import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { persistReducer } from "redux-persist"
import storage from "redux-persist/lib/storage"

import { LenderMlaSignatures, LenderMlaSignature } from "./interface"

const persistConfig = {
  key: "lenderMlaSignatures",
  storage,
}

const initialState: LenderMlaSignatures = {}

const lenderMlaSignaturesSlice = createSlice({
  name: "lenderMlaSignatures",
  initialState,
  reducers: {
    setLenderMlaSignature: (
      state,
      action: PayloadAction<LenderMlaSignature>,
    ) => {
      const market = action.payload.market.toLowerCase()
      const address = action.payload.address.toLowerCase()
      state[`${market}-${address}`] = action.payload
    },
    removeLenderMlaSignature: (state, action: PayloadAction<string>) => {
      delete state[action.payload]
    },
  },
})

export const { setLenderMlaSignature, removeLenderMlaSignature } =
  lenderMlaSignaturesSlice.actions

export default persistReducer(persistConfig, lenderMlaSignaturesSlice.reducer)
