import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import { LenderTableDataType } from "@/app/[locale]/borrower/edit-lenders-list/interface"
import { EditLendersListType } from "@/store/slices/editLendersListSlice/interface"

const initialState: EditLendersListType = {
  lenderFilter: "",
  marketFilter: { name: "All Markets", address: "" },
  step: "edit",
  activeBorrowerMarkets: [],
  initialLendersTableData: [],
  lendersTableData: [],
}

const editLendersListSlice = createSlice({
  name: "editLendersList",
  initialState,
  reducers: {
    setLenderFilter: (state, action: PayloadAction<string>) => {
      state.lenderFilter = action.payload
    },
    setMarketFilter: (
      state,
      action: PayloadAction<{ name: string; address: string }>,
    ) => {
      state.marketFilter = action.payload
    },
    setEditStep: (state, action: PayloadAction<"edit" | "confirm">) => {
      state.step = action.payload
    },
    setActiveBorrowerMarkets: (
      state,
      action: PayloadAction<{ name: string; address: string }[]>,
    ) => {
      state.activeBorrowerMarkets = action.payload
    },
    setInitialLendersTableData: (
      state,
      action: PayloadAction<LenderTableDataType[]>,
    ) => {
      state.initialLendersTableData = action.payload
    },
    setLendersTableData: (
      state,
      action: PayloadAction<LenderTableDataType[]>,
    ) => {
      state.lendersTableData = action.payload
    },
    resetFilters: (state) => {
      state.lenderFilter = initialState.lenderFilter
      state.marketFilter = initialState.marketFilter
    },
    resetRows: (state) => {
      state.lendersTableData = initialState.lendersTableData
    },
  },
})

export const {
  setLenderFilter,
  setMarketFilter,
  setEditStep,
  setActiveBorrowerMarkets,
  setInitialLendersTableData,
  setLendersTableData,
  resetFilters,
  resetRows,
} = editLendersListSlice.actions

export default editLendersListSlice.reducer
