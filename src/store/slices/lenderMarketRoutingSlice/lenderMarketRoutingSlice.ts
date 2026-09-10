import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export enum LenderMarketSections {
  TRANSACTIONS = "transactions",
  STATUS = "status",
  SUMMARY = "summary",
  REQUESTS = "requests",
  MARKET_HISTORY = "marketHistory",
  BORROWER_PROFILE = "borrowerProfile",
  WRAP_DEBT_TOKEN = "wrapDebtToken",
}

export type LenderMarketRoutingSliceType = {
  currentSection: LenderMarketSections
  hasSelectedSection: boolean
  isLoading: boolean
  isLender: boolean
  withdrawalsCount: number
}

const initialState: LenderMarketRoutingSliceType = {
  currentSection: LenderMarketSections.TRANSACTIONS,
  hasSelectedSection: false,
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
      state.hasSelectedSection = true
    },
    setDefaultSection: (state, action: PayloadAction<LenderMarketSections>) => {
      // Late account reads must not override a section the user selected.
      if (!state.hasSelectedSection) state.currentSection = action.payload
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
  setDefaultSection,
  setIsLoading,
  setIsLender,
  setWithdrawalsCount,
  resetPageState,
} = lenderMarketRoutingSlice.actions

export default lenderMarketRoutingSlice.reducer
