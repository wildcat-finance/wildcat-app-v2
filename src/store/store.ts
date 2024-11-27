import { configureStore } from "@reduxjs/toolkit"

import borrowerLendersTabSidebarSlice from "./slices/borrowerLendersTabSidebarSlice/borrowerLendersTabSidebarSlice"
import borrowerOverviewSlice from "./slices/borrowerOverviewSlice/borrowerOverviewSlice"
import editLendersListSlice from "./slices/editLendersListSlice/editLendersListSlice"
import editPolicySlice from "./slices/editPolicySlice/editPolicySlice"
import highlightSidebarSlice from "./slices/highlightSidebarSlice/highlightSidebarSlice"
import lenderMarketRoutingSlice from "./slices/lenderMarketRoutingSlice/lenderMarketRoutingSlice"
import marketsOverviewSidebarSlice from "./slices/marketsOverviewSidebarSlice/marketsOverviewSidebarSlice"
import notificationsSidebarSlice from "./slices/notificationsSidebarSlice/notificationsSidebarSlice"
import notificationsSlice from "./slices/notificationsSlice/notificationsSlice"
import routingSlice from "./slices/routingSlice/routingSlice"

export const makeStore = () =>
  configureStore({
    reducer: {
      routing: routingSlice,
      marketsOverviewSidebar: marketsOverviewSidebarSlice,
      highlightSidebar: highlightSidebarSlice,
      lenderMarketRouting: lenderMarketRoutingSlice,
      editLendersList: editLendersListSlice,
      editPolicy: editPolicySlice,
      borrowerOverview: borrowerOverviewSlice,
      notifications: notificationsSlice,
      notificationsSidebar: notificationsSidebarSlice,
      borrowerLendersTabSidebar: borrowerLendersTabSidebarSlice,
    },
  })

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore["getState"]>
export type AppDispatch = AppStore["dispatch"]
