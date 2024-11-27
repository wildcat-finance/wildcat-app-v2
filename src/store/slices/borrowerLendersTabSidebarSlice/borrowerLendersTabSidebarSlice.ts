import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import { BorrowerLendersTabSidebarType } from "@/store/slices/borrowerLendersTabSidebarSlice/interface"

const initialState: BorrowerLendersTabSidebarType = {
  marketFilter: [],
  lenderFilter: [],
  searchFilter: "",
}

const borrowerLendersTabSidebarSlice = createSlice({
  name: "borrowerLendersTabSidebar",
  initialState,
  reducers: {
    setMarketsFilter: (
      state,
      action: PayloadAction<{ name: string; address: string }[]>,
    ) => {
      state.marketFilter = action.payload
    },
    setLendersFilter: (
      state,
      action: PayloadAction<{ name: string; address: string }[]>,
    ) => {
      state.lenderFilter = action.payload
    },
    setSearchFilter: (state, action: PayloadAction<string>) => {
      state.searchFilter = action.payload
    },
    resetFilters: () => initialState,
  },
})

export const {
  setMarketsFilter,
  setLendersFilter,
  setSearchFilter,
  resetFilters,
} = borrowerLendersTabSidebarSlice.actions
export default borrowerLendersTabSidebarSlice.reducer
