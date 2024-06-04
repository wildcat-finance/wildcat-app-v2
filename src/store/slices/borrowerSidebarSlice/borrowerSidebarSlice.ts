import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import { MarketStatus } from "@/utils/marketStatus"

import { SidebarMarketAssets, TBorrowerSidebarType } from "./interface"

const initialState: TBorrowerSidebarType = {
  status: "All",
  underlyingAsset: SidebarMarketAssets.ALL,
}

const borrowerSidebarSlice = createSlice({
  name: "borrowerSidebar",
  initialState,
  reducers: {
    setBorrowerMarketStatus: (
      state,
      action: PayloadAction<MarketStatus | "All">,
    ) => {
      state.status = action.payload
    },
    setBorrowerMarketAsset: (
      state,
      action: PayloadAction<SidebarMarketAssets>,
    ) => {
      state.underlyingAsset = action.payload
    },
  },
})

export const { setBorrowerMarketStatus, setBorrowerMarketAsset } =
  borrowerSidebarSlice.actions
export default borrowerSidebarSlice.reducer
