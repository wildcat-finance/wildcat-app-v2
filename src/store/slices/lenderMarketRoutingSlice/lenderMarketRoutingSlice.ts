import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export enum LenderMarketSections {
  TRANSACTIONS = "transactions",
  STATUS = "status",
  SUMMARY = "summary",
  REQUESTS = "requests",
  MARKET_HISTORY = "marketHistory",
  BORROWER_PROFILE = "borrowerProfile",
}

export type LenderMarketRoutingSliceType = {
  currentSection: LenderMarketSections
  isLoading: boolean
  isLender: boolean
  ongoingAmount: number
}

const initialState: LenderMarketRoutingSliceType = {
  currentSection: LenderMarketSections.TRANSACTIONS,
  isLoading: true,
  isLender: false,
  ongoingAmount: 0,
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
    setOngoingAmount: (state, action: PayloadAction<number>) => {
      state.ongoingAmount = action.payload
    },
    resetPageState: () => initialState,
  },
})

export const {
  setSection,
  setIsLoading,
  setIsLender,
  setOngoingAmount,
  resetPageState,
} = lenderMarketRoutingSlice.actions

export default lenderMarketRoutingSlice.reducer
