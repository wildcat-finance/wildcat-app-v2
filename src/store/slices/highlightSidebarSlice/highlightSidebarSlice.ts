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
    tokenWrapper: false,
  },
  withdrawalsCount: 0,
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
    setWithdrawalsCount: (state, action: PayloadAction<number>) => {
      state.withdrawalsCount = action.payload
    },
    resetPageState: () => initialState,
  },
})

export const {
  setSidebarHighlightState,
  setCheckBlock,
  setWithdrawalsCount,
  resetPageState,
} = highlightSidebarSlice.actions

export default highlightSidebarSlice.reducer
