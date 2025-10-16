import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { persistReducer } from "redux-persist"
import storage from "redux-persist/lib/storage"

import { ApiToken, ApiTokensType } from "./interface"

const persistConfig = {
  key: "apiTokens",
  storage,
}

const initialState: ApiTokensType = {}

const apiTokensSlice = createSlice({
  name: "apiTokens",
  initialState,
  reducers: {
    setApiToken: (state, action: PayloadAction<ApiToken>) => {
      state[action.payload.address.toLowerCase()] = action.payload
    },
    removeApiToken: (state, action: PayloadAction<string>) => {
      delete state[action.payload]
    },
  },
})

export const { setApiToken, removeApiToken } = apiTokensSlice.actions
export default persistReducer(persistConfig, apiTokensSlice.reducer)
