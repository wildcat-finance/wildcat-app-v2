import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export enum LenderMarketSections {
  TRANSACTIONS = "transactions",
  STATUS = "status",
  REQUESTS = "requests",
}

export type LenderMarketRoutingSliceType = {
  currentSection: LenderMarketSections
  isLoading: boolean
}

const initialState: LenderMarketRoutingSliceType = {
  currentSection: LenderMarketSections.TRANSACTIONS,
  isLoading: true,
}

const lenderMarketRoutingSlice = createSlice({
  name: "lenderMarketRouting",
  initialState,
  reducers: {
    setSection: (state, action: PayloadAction<LenderMarketSections>) => {
      state.currentSection = action.payload
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    resetPageState: () => initialState,
  },
})

export const { setSection, setIsLoading } = lenderMarketRoutingSlice.actions

export default lenderMarketRoutingSlice.reducer
