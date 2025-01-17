import { createSlice } from "@reduxjs/toolkit"

import { THighLightSidebar } from "@/store/slices/highlightSidebarSlice/interface"

const initialState: THighLightSidebar = {
  checked: 1,
  sidebarState: {
    borrowRepay: true,
    statusDetails: false,
    withdrawals: false,
    lenders: false,
    mla: false,
    marketHistory: false,
  },
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
    resetPageState: () => initialState,
  },
})

export const { setSidebarHighlightState, setCheckBlock, resetPageState } =
  highlightSidebarSlice.actions

export default highlightSidebarSlice.reducer
