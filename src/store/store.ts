import { configureStore } from "@reduxjs/toolkit"

import borrowerLendersTabSidebarSlice from "./slices/borrowerLendersTabSidebarSlice/borrowerLendersTabSidebarSlice"
import borrowerOverviewSlice from "./slices/borrowerOverviewSlice/borrowerOverviewSlice"
import borrowerSidebarSlice from "./slices/borrowerSidebarSlice/borrowerSidebarSlice"
import editLendersListSlice from "./slices/editLendersListSlice/editLendersListSlice"
import highlightSidebarSlice from "./slices/highlightSidebarSlice/highlightSidebarSlice"
import routingSlice from "./slices/routingSlice/routingSlice"

export const makeStore = () =>
  configureStore({
    reducer: {
      routing: routingSlice,
      borrowerSidebar: borrowerSidebarSlice,
      highlightSidebar: highlightSidebarSlice,
      editLendersList: editLendersListSlice,
      borrowerOverview: borrowerOverviewSlice,
      borrowerLendersTabSidebar: borrowerLendersTabSidebarSlice,
    },
  })

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore["getState"]>
export type AppDispatch = AppStore["dispatch"]
