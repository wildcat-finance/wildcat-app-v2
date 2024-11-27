import { createSlice } from "@reduxjs/toolkit"

import { TNotificationsSidebar } from "@/store/slices/notificationsSidebarSlice/interface"

const initialState: TNotificationsSidebar = {
  checked: 1,
  sidebarState: {
    all: true,
    marketActivity: false,
    newLenders: false,
  },
}

const notificationsSidebarSlice = createSlice({
  name: "notificationsSidebar",
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
  notificationsSidebarSlice.actions

export default notificationsSidebarSlice.reducer
