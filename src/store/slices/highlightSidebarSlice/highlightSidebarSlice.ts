import { createSlice } from "@reduxjs/toolkit"

import { THighLightSidebar } from "@/store/slices/highlightSidebarSlice/interface"

const initialState: THighLightSidebar = {
  checked: 1,
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
    setCheckBlock: (state, action) => {
      state.checked = action.payload
    },
  },
})

export const { setSidebarHighlightState, setCheckBlock } =
  highlightSidebarSlice.actions

export default highlightSidebarSlice.reducer
