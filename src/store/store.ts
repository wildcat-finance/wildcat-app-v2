import { configureStore } from "@reduxjs/toolkit"

import highlightSidebarSlice from "@/store/slices/highlightSidebarSlice/highlightSidebarSlice"
import borrowerSidebarSlice from "./slices/borrowerSidebarSlice/borrowerSidebarSlice"
import notificationsSidebarSlice from "./slices/notificationsSidebarSlice/notificationsSidebarSlice"
import routingSlice from "./slices/routingSlice/routingSlice"

export const makeStore = () =>
  configureStore({
    reducer: {
      routing: routingSlice,
      borrowerSidebar: borrowerSidebarSlice,
      highlightSidebar: highlightSidebarSlice,
      notificationsSidebar: notificationsSidebarSlice,
    },
  })

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore["getState"]>
export type AppDispatch = AppStore["dispatch"]
