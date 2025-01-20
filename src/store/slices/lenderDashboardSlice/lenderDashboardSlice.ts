import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export enum LenderMarketDashboardSections {
  ACTIVE = "active",
  TERMINATED = "terminated",
  OTHER = "other",
}

export type LenderDashboardType = {
  marketSection: LenderMarketDashboardSections
  showFullFunctionality: boolean
  scrollTarget: string | null
}

const initialState: LenderDashboardType = {
  marketSection: LenderMarketDashboardSections.ACTIVE,
  showFullFunctionality: false,
  scrollTarget: null,
}

const lenderDashboardSlice = createSlice({
  name: "lenderDashboard",
  initialState,
  reducers: {
    setMarketSection: (
      state,
      action: PayloadAction<LenderMarketDashboardSections>,
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
    resetLenderDashboard: () => initialState,
  },
})

export const {
  setMarketSection,
  setScrollTarget,
  setShowFullFunctionality,
  resetMarketSection,
  resetLenderDashboard,
} = lenderDashboardSlice.actions
export default lenderDashboardSlice.reducer
