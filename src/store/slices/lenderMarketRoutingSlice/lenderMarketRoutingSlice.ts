import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export enum LenderMarketSections {
  TRANSACTIONS = "transactions",
  STATUS = "status",
  SUMMARY = "summary",
  REQUESTS = "requests",
  MARKET_HISTORY = "marketHistory",
  BORROWER_PROFILE = "borrowerProfile",
  WRAP_DEBT_TOKEN = "wrapDebtToken",
  ANALYTICS = "analytics",
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
      const selectedSectionUnavailable =
        action.payload === LenderMarketSections.STATUS &&
        [
          LenderMarketSections.TRANSACTIONS,
          LenderMarketSections.REQUESTS,
          LenderMarketSections.WRAP_DEBT_TOKEN,
        ].includes(state.currentSection)
      // Preserve the user's choice only while that section remains available.
      if (selectedSectionUnavailable) state.hasSelectedSection = false
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
