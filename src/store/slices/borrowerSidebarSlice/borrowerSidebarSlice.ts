import { createSlice, PayloadAction } from "@reduxjs/toolkit"

const initialState = {
  status: "All",
  underlyingAsset: "All",
}

const borrowerSidebarSlice = createSlice({
  name: "borrowerSidebar",
  initialState,
  reducers: {
    setBorrowerMarketStatus: (state, action: PayloadAction<string>) => {
      state.status = action.payload
    },
    setBorrowerMarketAsset: (state, action: PayloadAction<string>) => {
      state.underlyingAsset = action.payload
    },
  },
})

export const { setBorrowerMarketStatus, setBorrowerMarketAsset } =
  borrowerSidebarSlice.actions
export default borrowerSidebarSlice.reducer
