import { createElement, ReactNode } from "react"

import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import { TNotifications } from "./interface"

const formatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

const initialState: TNotifications = [
  // {
  //   description: "You have been successfully onboarded as a borrower.",
  //   type: "borrowerRegistrationChange",
  //   category: "marketActivity",
  //   date: formatter.format(Date.now()),
  //   unread: true,
  // },
  // {
  //   description: "You have been removed as a borrower.",
  //   type: "borrowerRegistrationChange",
  //   category: "marketActivity",
  //   date: formatter.format(Date.now()),
  //   unread: true,
  // },
  // {
  //   description: createElement("fragment", null, [
  //     "The APR decrease related min reserve change has ended for ",
  //     createElement("strong", null, "Ethereum Market"),
  //     ".",
  //   ]),
  //   type: "aprDecreaseEnded",
  //   category: "marketActivity",
  //   date: formatter.format(Date.now()),
  //   unread: true,
  //   data: {
  //     apr: "14.98303 WETH",
  //     newApr: "18.98303 WETH",
  //     percentageIncrease: 27.5,
  //   },
  // },
  // {
  //   description: createElement("fragment", null, [
  //     "A lender has been added to ",
  //     createElement("strong", null, "Ethereum Market"),
  //     ".",
  //   ]),
  //   type: "lenderAdded",
  //   category: "newLenders",
  //   date: formatter.format(Date.now()),
  //   unread: true,
  //   action: {
  //     label: "Lenders List",
  //     onClick: () => {},
  //   },
  // },
  // {
  //   description: createElement("fragment", null, [
  //     "A lender has been removed from ",
  //     createElement("strong", null, "Ethereum Market"),
  //     ".",
  //   ]),
  //   type: "lenderRemoved",
  //   category: "marketActivity",
  //   date: formatter.format(Date.now()),
  //   unread: true,
  //   action: {
  //     label: "Lenders List",
  //     onClick: () => {},
  //   },
  // },
  // {
  //   description: createElement("fragment", null, [
  //     "A lender has started a withdrawal cycle for ",
  //     createElement("strong", null, "Ethereum Market"),
  //     ".",
  //   ]),
  //   type: "withdrawalStarted",
  //   category: "marketActivity",
  //   date: formatter.format(Date.now()),
  //   unread: true,
  //   data: {
  //     timeRemaining: 60,
  //   },
  // },
  // {
  //   description: createElement("fragment", null, [
  //     "A lender has claimed their tokens from ",
  //     createElement("strong", null, "Ethereum Market"),
  //     ".",
  //   ]),
  //   type: "lenderClaimed",
  //   category: "marketActivity",
  //   date: formatter.format(Date.now()),
  //   unread: true,
  //   data: {
  //     amount: 5.1234,
  //     token: "WETH",
  //   },
  // },
  // {
  //   description: createElement("fragment", null, [
  //     "Withdrawal cycle for ",
  //     createElement("strong", null, "Ethereum Market"),
  //     " completed successfully.",
  //   ]),
  //   type: "withdrawalSuccess",
  //   category: "marketActivity",
  //   date: formatter.format(Date.now()),
  //   unread: true,
  // },
  // {
  //   description: createElement("fragment", null, [
  //     "Withdrawal cycle for ",
  //     createElement("strong", null, "Ethereum Market"),
  //     " failed to complete.",
  //   ]),
  //   type: "withdrawalFailed",
  //   category: "marketActivity",
  //   date: formatter.format(Date.now()),
  //   unread: true,
  //   error: true,
  //   data: {
  //     amount: 5.1234,
  //     token: "WETH",
  //   },
  // },
  // {
  //   description: "You have borrowed 5.1234 WETH from Ethereum Market.",
  //   type: "loanTaken",
  //   category: "marketActivity",
  //   date: formatter.format(Date.now()),
  //   unread: true,
  // },
  // {
  //   description: "You have repaid 5.1234 WETH to Ethereum Market.",
  //   type: "loanRepaid",
  //   category: "marketActivity",
  //   date: formatter.format(Date.now()),
  //   unread: true,
  // },
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
    },
  },
})

export const {
  addNotification,
  removeNotification,
  markAsRead,
  markAllAsRead,
} = notificationsSlice.actions

export default notificationsSlice.reducer
