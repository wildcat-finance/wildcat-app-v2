import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import { THighLightSidebar } from "@/store/slices/highlightSidebarSlice/interface"

const initialState: THighLightSidebar = {
  checked: 1,
  sidebarState: {
    borrowRepay: true,
    statusDetails: false,
    marketSummary: false,
    withdrawals: false,
    lenders: false,
    mla: false,
    marketHistory: false,
  },
  withdrawalsAmount: 0,
}

const highlightSidebarSlice = createSlice({
  name: "highlightSidebar",
  initialState,
  reducers: {
    setSidebarHighlightState: (state, action) => {
      state.sidebarState = action.payload
    },
    setCheckBlock: (state, action) => {
      state.checked = action.payload
    },
    setWithdrawalsAmount: (state, action: PayloadAction<number>) => {
      state.withdrawalsAmount = action.payload
    },
    resetPageState: () => initialState,
  },
})

export const {
  setSidebarHighlightState,
  setCheckBlock,
  setWithdrawalsAmount,
  resetPageState,
} = highlightSidebarSlice.actions

export default highlightSidebarSlice.reducer
