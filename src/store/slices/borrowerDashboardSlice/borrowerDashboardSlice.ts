import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export enum BorrowerDashboardSections {
  MARKETS = "markets",
  POLICIES = "policies",
  LENDERS = "lenders",
}

export enum BorrowerMarketDashboardSections {
  ACTIVE = "active",
  TERMINATED = "terminated",
  OTHER = "other",
}

export type BorrowerDashboardType = {
  section: BorrowerDashboardSections
  marketSection: BorrowerMarketDashboardSections
  showFullFunctionality: boolean
  scrollTarget: string | null
}

const initialState: BorrowerDashboardType = {
  section: BorrowerDashboardSections.MARKETS,
  marketSection: BorrowerMarketDashboardSections.ACTIVE,
  showFullFunctionality: false,
  scrollTarget: null,
}

const borrowerDashboardSlice = createSlice({
  name: "borrowerDashboard",
  initialState,
  reducers: {
    setSection: (state, action: PayloadAction<BorrowerDashboardSections>) => {
      state.section = action.payload
    },
    setMarketSection: (
      state,
      action: PayloadAction<BorrowerMarketDashboardSections>,
    ) => {
      state.marketSection = action.payload
    },
    setScrollTarget: (state, action: PayloadAction<string | null>) => {
      state.scrollTarget = action.payload
    },
    setShowFullFunctionality: (state, action: PayloadAction<boolean>) => {
      state.showFullFunctionality = action.payload
    },
    resetMarketSection: (state) => {
      state.marketSection = initialState.marketSection
    },
    resetBorrowerDashboard: () => initialState,
  },
})

export const {
  setSection,
  setMarketSection,
  setScrollTarget,
  setShowFullFunctionality,
  resetMarketSection,
  resetBorrowerDashboard,
} = borrowerDashboardSlice.actions
export default borrowerDashboardSlice.reducer
