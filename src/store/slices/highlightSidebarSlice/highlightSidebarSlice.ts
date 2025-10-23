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
  ongoingAmount: 0,
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
    setOngoingAmount: (state, action: PayloadAction<number>) => {
      state.ongoingAmount = action.payload
    },
    resetPageState: () => initialState,
  },
})

export const {
  setSidebarHighlightState,
  setCheckBlock,
  setOngoingAmount,
  resetPageState,
} = highlightSidebarSlice.actions

export default highlightSidebarSlice.reducer
