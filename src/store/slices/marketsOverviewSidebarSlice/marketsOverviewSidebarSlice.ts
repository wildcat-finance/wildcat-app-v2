import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import { MarketStatus } from "@/utils/marketStatus"

export type MarketsOverviewSidebarSliceType = {
  marketName: string
  marketsStatuses: MarketStatus[]
  marketsAssets: { name: string; address: string }[]
}

const initialState: MarketsOverviewSidebarSliceType = {
  marketName: "",
  marketsStatuses: [],
  marketsAssets: [],
}

const marketsOverviewSidebarSlice = createSlice({
  name: "marketsOverviewSidebar",
  initialState,
  reducers: {
    setMarketName: (state, action: PayloadAction<string>) => {
      state.marketName = action.payload
    },
    setMarketsStatuses: (state, action: PayloadAction<MarketStatus[]>) => {
      state.marketsStatuses = action.payload
    },
    setMarketsAssets: (
      state,
      action: PayloadAction<{ name: string; address: string }[]>,
    ) => {
      state.marketsAssets = action.payload
    },
    resetSidebarSlice: () => initialState,
  },
})

export const {
  setMarketName,
  setMarketsStatuses,
  setMarketsAssets,
  resetSidebarSlice,
} = marketsOverviewSidebarSlice.actions
export default marketsOverviewSidebarSlice.reducer
