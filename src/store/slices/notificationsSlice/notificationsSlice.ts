import { createElement, Fragment, ReactNode } from "react"

import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import { TNotifications } from "./interface"

const formatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

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
  },
})

export const { addNotification, markAsRead, markAllAsRead } =
  notificationsSlice.actions

export default notificationsSlice.reducer
