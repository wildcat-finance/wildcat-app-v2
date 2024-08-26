import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import { MarketDataT } from "@/app/[locale]/borrower/edit_lenders/lendersMock"
import { TEditLenders } from "@/store/slices/editLendersSlice/interface"

const initialState: TEditLenders = {
  lenderFilter: "",
  marketFilter: [],
  step: "edit",
}

const editLendersSlice = createSlice({
  name: "editLenders",
  initialState,
  reducers: {
    setEditStep: (state, action: PayloadAction<"edit" | "confirm">) => {
      state.step = action.payload
    },
    setLenderFilter: (state, action: PayloadAction<string>) => {
      state.lenderFilter = action.payload
    },
    setMarketFilter: (state, action: PayloadAction<MarketDataT[]>) => {
      state.marketFilter = action.payload
    },
    resetEditLendersSlice: () => initialState,
  },
})

export const {
  setEditStep,
  setLenderFilter,
  setMarketFilter,
  resetEditLendersSlice,
} = editLendersSlice.actions

export default editLendersSlice.reducer
