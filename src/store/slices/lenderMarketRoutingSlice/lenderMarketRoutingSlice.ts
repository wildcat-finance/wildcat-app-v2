import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export enum LenderMarketSections {
  TRANSACTIONS = "transactions",
  STATUS = "status",
  REQUESTS = "requests",
  MARKET_HISTORY = "marketHistory",
  BORROWER_PROFILE = "borrowerProfile",
  COLLATERAL_CONTRACT = "collateralContract",
}

export type LenderMarketRoutingSliceType = {
  currentSection: LenderMarketSections
  isLoading: boolean
  isLender: boolean
  hasCollateralContract: boolean
}

const initialState: LenderMarketRoutingSliceType = {
  currentSection: LenderMarketSections.TRANSACTIONS,
  isLoading: true,
  isLender: false,
  hasCollateralContract: false,
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
    setHasCollateralContract: (state, action: PayloadAction<boolean>) => {
      state.hasCollateralContract = action.payload
    },
    resetPageState: () => initialState,
  },
})

export const {
  setSection,
  setIsLoading,
  setIsLender,
  setHasCollateralContract,
  resetPageState,
} = lenderMarketRoutingSlice.actions

export default lenderMarketRoutingSlice.reducer
