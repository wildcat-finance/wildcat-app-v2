// Persisted last-known borrower restriction states (product#789). The cache
// exists for fail-closed behaviour: when the restriction API cannot be
// reached, the last known answer applies, so downtime never re-enables a
// restricted borrower.
import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { persistReducer } from "redux-persist"
import storage from "redux-persist/lib/storage"

import {
  LastKnownRestrictionsType,
  SetLastKnownRestrictionPayload,
} from "./interface"

const persistConfig = {
  key: "borrowerRestriction",
  storage,
}

const initialState: LastKnownRestrictionsType = {}

export const getRestrictionKey = (address: string, chainId: number) =>
  `${address.toLowerCase()}_${chainId}`

const borrowerRestrictionSlice = createSlice({
  name: "borrowerRestriction",
  initialState,
  reducers: {
    setLastKnownRestriction: (
      state,
      action: PayloadAction<SetLastKnownRestrictionPayload>,
    ) => {
      state[getRestrictionKey(action.payload.address, action.payload.chainId)] =
        action.payload.state
    },
  },
})

export const { setLastKnownRestriction } = borrowerRestrictionSlice.actions
export default persistReducer(persistConfig, borrowerRestrictionSlice.reducer)
