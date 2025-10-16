import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"

export type MarketFilters = {
  search: string
  assets: SmallFilterSelectItem[]
  statuses: SmallFilterSelectItem[]
}

export type MarketFiltersRole = "borrower" | "lender"

export interface MarketFiltersState {
  borrower: MarketFilters
  lender: MarketFilters
}

const emptyFilters: MarketFilters = { search: "", assets: [], statuses: [] }

const initialState: MarketFiltersState = {
  borrower: emptyFilters,
  lender: emptyFilters,
}

type SetMarketFiltersPayload = {
  role: MarketFiltersRole
  filters: Partial<MarketFilters>
}

const marketFiltersSlice = createSlice({
  name: "marketFilters",
  initialState,
  reducers: {
    setMarketFilters: (
      state,
      action: PayloadAction<SetMarketFiltersPayload>,
    ) => {
      const { role, filters } = action.payload
      state[role] = { ...state[role], ...filters }
    },
    resetMarketFilters: (state, action: PayloadAction<MarketFiltersRole>) => {
      state[action.payload] = emptyFilters
    },
    resetAllMarketFilters: () => initialState,
  },
})

export const { setMarketFilters, resetMarketFilters, resetAllMarketFilters } =
  marketFiltersSlice.actions
export default marketFiltersSlice.reducer
