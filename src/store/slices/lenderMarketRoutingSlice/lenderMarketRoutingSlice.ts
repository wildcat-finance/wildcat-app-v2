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
  withdrawalsCount: number
}

const initialState: LenderMarketRoutingSliceType = {
  currentSection: LenderMarketSections.TRANSACTIONS,
  isLoading: true,
  isLender: false,
  withdrawalsCount: 0,
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
    setWithdrawalsCount: (state, action: PayloadAction<number>) => {
      state.withdrawalsCount = action.payload
    },
    resetPageState: () => initialState,
  },
})

export const {
  setSection,
  setIsLoading,
  setIsLender,
  setWithdrawalsCount,
  resetPageState,
} = lenderMarketRoutingSlice.actions

export default lenderMarketRoutingSlice.reducer
