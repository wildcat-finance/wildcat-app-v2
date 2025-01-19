import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export enum LenderMarketSections {
  TRANSACTIONS = "transactions",
  STATUS = "status",
  REQUESTS = "requests",
  MARKET_HISTORY = "marketHistory",
}

export type LenderMarketRoutingSliceType = {
  currentSection: LenderMarketSections
  isLoading: boolean
  isLender: boolean
}

const initialState: LenderMarketRoutingSliceType = {
  currentSection: LenderMarketSections.TRANSACTIONS,
  isLoading: true,
  isLender: false,
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
    setIsLender: (state, action: PayloadAction<boolean>) => {
      state.isLender = action.payload
    },
    resetPageState: () => initialState,
  },
})

export const { setSection, setIsLoading, setIsLender, resetPageState } =
  lenderMarketRoutingSlice.actions

export default lenderMarketRoutingSlice.reducer
