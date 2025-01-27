import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import { TNotifications } from "./interface"

const initialState: TNotifications = []

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<TNotifications[0]>) => {
      state.push(action.payload)
      state.sort((a, b) => b.blockTimestamp - a.blockTimestamp)
    },
    markAsRead: (state, action: PayloadAction<number>) => {
      state[action.payload].unread = false
    },
    markAllAsRead: (state) => {
      state.forEach((notification) => {
        notification.unread = false
      })
    },
    clear: () => initialState,
  },
})

export const { addNotification, markAsRead, markAllAsRead, clear } =
  notificationsSlice.actions

export default notificationsSlice.reducer
