import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import { LenderMarketOrigin } from "@/utils/lenderMarketOrigin"

export type LenderMarketOriginState = {
  /** The lender list page the user was last on, or null if not yet known. */
  origin: LenderMarketOrigin | null
}

const initialState: LenderMarketOriginState = {
  origin: null,
}

const lenderMarketOriginSlice = createSlice({
  name: "lenderMarketOrigin",
  initialState,
  reducers: {
    setLenderMarketOrigin: (
      state,
      action: PayloadAction<LenderMarketOrigin>,
    ) => {
      state.origin = action.payload
    },
    restoreLenderMarketOrigin: (
      state,
      action: PayloadAction<LenderMarketOrigin | undefined>,
    ) => {
      if (!state.origin && action.payload) state.origin = action.payload
    },
  },
})

export const { setLenderMarketOrigin, restoreLenderMarketOrigin } =
  lenderMarketOriginSlice.actions

export default lenderMarketOriginSlice.reducer
