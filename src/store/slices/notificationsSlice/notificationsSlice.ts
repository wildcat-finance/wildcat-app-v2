import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import { TNotifications } from "./interface"

const formatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const initialState: TNotifications = [
  {
    description: "Succesfully onboarded!",
    category: "marketActivity",
    type: "onboardSuccesful",
    date: formatter.format(Date.now()),
    unread: true,
    error: false,
  },
  {
    description: "Failed to onboard",
    category: "newLenders",
    type: "onboardFailed",
    date: formatter.format(Date.now()),
    unread: true,
    error: true,
  },
]

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<TNotifications[0]>) => {
      state.push(action.payload)
    },
    removeNotification: (state, action: PayloadAction<number>) => {
      state.splice(action.payload, 1)
    },
    markAsRead: (state, action: PayloadAction<number>) => {
      state[action.payload].unread = false
    },
    markAllAsRead: (state) => {
      state.forEach((notification) => {
        notification.unread = false
      })
    }
  },
})

export const { addNotification, removeNotification, markAsRead, markAllAsRead } = notificationsSlice.actions

export default notificationsSlice.reducer