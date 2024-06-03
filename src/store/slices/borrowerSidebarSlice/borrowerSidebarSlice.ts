import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import {
  SidebarMarketAssets,
  TBorrowerSidebarType,
} from "@/store/slices/borrowerSidebarSlice/interface"

const initialState: TBorrowerSidebarType = {
  status: "All",
  underlyingAsset: SidebarMarketAssets.ALL,
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
