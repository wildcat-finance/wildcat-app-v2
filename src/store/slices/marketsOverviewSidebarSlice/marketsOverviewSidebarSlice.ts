import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import { MarketStatus } from "@/utils/marketStatus"

import { MarketsOverviewSidebarSliceType } from "./interface"

const initialState: MarketsOverviewSidebarSliceType = {
  marketName: "",
  marketsStatuses: [],
  marketsAssets: [],
  scrollTarget: null,
}

const marketsOverviewSidebarSlice = createSlice({
  name: "marketsOverviewSidebar",
  initialState,
  reducers: {
    setActiveAmount: (state, action: PayloadAction<string>) => {
      state.activeMarketsAmount = action.payload
    },
    setTerminatedAmount: (state, action: PayloadAction<string>) => {
      state.terminatedMarketsAmount = action.payload
    },
    setOtherAmount: (state, action: PayloadAction<string>) => {
      state.otherMarketsAmount = action.payload
    },
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
    setScrollTarget: (state, action: PayloadAction<string | null>) => {
      state.scrollTarget = action.payload
    },
    resetSidebarSlice: () => initialState,
  },
})

export const {
  setActiveAmount,
  setTerminatedAmount,
  setOtherAmount,
  setMarketName,
  setMarketsStatuses,
  setMarketsAssets,
  resetSidebarSlice,
  setScrollTarget,
} = marketsOverviewSidebarSlice.actions
export default marketsOverviewSidebarSlice.reducer
