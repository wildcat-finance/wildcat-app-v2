import { configureStore } from "@reduxjs/toolkit"
import { persistStore } from "redux-persist"

import borrowerDashboardAmountsSlice from "@/store/slices/borrowerDashboardAmountsSlice/borrowerDashboardAmountsSlice"
import borrowerDashboardSlice from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"
import createMarketSidebarSlice from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"
import lenderDashboardSlice from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import policyLendersSlice from "@/store/slices/policyLendersSlice/policyLendersSlice"

import apiTokensSlice from "./slices/apiTokensSlice/apiTokensSlice"
import borrowerLendersTabSidebarSlice from "./slices/borrowerLendersTabSidebarSlice/borrowerLendersTabSidebarSlice"
import borrowerOverviewSlice from "./slices/borrowerOverviewSlice/borrowerOverviewSlice"
import editLendersListSlice from "./slices/editLendersListSlice/editLendersListSlice"
import editPolicySlice from "./slices/editPolicySlice/editPolicySlice"
import highlightSidebarSlice from "./slices/highlightSidebarSlice/highlightSidebarSlice"
import lenderMarketRoutingSlice from "./slices/lenderMarketRoutingSlice/lenderMarketRoutingSlice"
import lenderMlaSignaturesSlice from "./slices/lenderMlaSignaturesSlice/mlaSignaturesSlice"
import marketsOverviewSidebarSlice from "./slices/marketsOverviewSidebarSlice/marketsOverviewSidebarSlice"
import notificationsSidebarSlice from "./slices/notificationsSidebarSlice/notificationsSidebarSlice"
import notificationsSlice from "./slices/notificationsSlice/notificationsSlice"
import routingSlice from "./slices/routingSlice/routingSlice"

export const makeStore = () => {
  const store = configureStore({
    reducer: {
      apiTokens: apiTokensSlice,
      routing: routingSlice,
      createMarketSidebar: createMarketSidebarSlice,
      marketsOverviewSidebar: marketsOverviewSidebarSlice,
      borrowerDashboard: borrowerDashboardSlice,
      borrowerDashboardAmounts: borrowerDashboardAmountsSlice,
      lenderDashboard: lenderDashboardSlice,
      highlightSidebar: highlightSidebarSlice,
      lenderMarketRouting: lenderMarketRoutingSlice,
      editLendersList: editLendersListSlice,
      policyLenders: policyLendersSlice,
      editPolicy: editPolicySlice,
      borrowerOverview: borrowerOverviewSlice,
      notifications: notificationsSlice,
      notificationsSidebar: notificationsSidebarSlice,
      borrowerLendersTabSidebar: borrowerLendersTabSidebarSlice,
      lenderMlaSignatures: lenderMlaSignaturesSlice,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
        },
      }),
  })

  persistStore(store)

  return store
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore["getState"]>
export type AppDispatch = AppStore["dispatch"]
