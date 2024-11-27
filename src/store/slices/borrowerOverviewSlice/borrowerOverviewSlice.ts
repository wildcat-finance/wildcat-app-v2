import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import {
  BorrowerOverviewTabs,
  BorrowerOverviewType,
} from "@/store/slices/borrowerOverviewSlice/interface"

const initialState: BorrowerOverviewType = {
  tab: BorrowerOverviewTabs.MARKETS,
}

const borrowerOverviewSlice = createSlice({
  name: "borrowerOverview",
  initialState,
  reducers: {
    setTab: (state, action: PayloadAction<BorrowerOverviewTabs>) => {
      state.tab = action.payload
    },
  },
})

export const { setTab } = borrowerOverviewSlice.actions
export default borrowerOverviewSlice.reducer
