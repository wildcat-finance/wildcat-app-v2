import { createSlice } from "@reduxjs/toolkit"

import { THighLightSidebar } from "@/store/slices/highlightSidebarSlice/interface"

const initialState: THighLightSidebar = {
  sidebarState: {
    borrowRepay: true,
    statusDetails: false,
    withdrawals: false,
    lenders: false,
  },
}

const highlightSidebarSlice = createSlice({
  name: "highlightSidebar",
  initialState,
  reducers: {
    setSidebarHighlightState: (state, action) => {
      state.sidebarState = action.payload
    },
  },
})

export const { setSidebarHighlightState } = highlightSidebarSlice.actions

export default highlightSidebarSlice.reducer
