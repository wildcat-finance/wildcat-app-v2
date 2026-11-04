import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export enum LenderMarketDashboardSections {
  ACTIVE = "active",
  TERMINATED = "terminated",
  OTHER = "other",
}

export enum LenderAllMarketsTab {
  SELF_ONBOARD = "self-onboard",
  MANUAL = "manual",
  TERMINATED = "other-terminated",
  DEFAULTED = "other-defaulted",
}

export enum LenderMyMarketsTab {
  DEPOSITED = "deposited",
  NON_DEPOSITED = "non-deposited",
  TERMINATED = "terminated",
  DEFAULTED = "defaulted",
}

export enum LenderSection {
  EXPLORE = "explore",
  MY_MARKETS = "my-markets",
  ALL_MARKETS = "all-markets",
}

export type LenderDashboardType = {
  marketSection: LenderMarketDashboardSections
  allMarketsTab: LenderAllMarketsTab
  myMarketsTab: LenderMyMarketsTab
  showFullFunctionality: boolean
  scrollTarget: string | null
}

const initialState: LenderDashboardType = {
  marketSection: LenderMarketDashboardSections.ACTIVE,
  allMarketsTab: LenderAllMarketsTab.SELF_ONBOARD,
  myMarketsTab: LenderMyMarketsTab.DEPOSITED,
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

      if (action.payload === LenderMarketDashboardSections.TERMINATED) {
        state.myMarketsTab = LenderMyMarketsTab.TERMINATED
      } else if (
        action.payload === LenderMarketDashboardSections.ACTIVE &&
        state.myMarketsTab === LenderMyMarketsTab.TERMINATED
      ) {
        state.myMarketsTab = LenderMyMarketsTab.DEPOSITED
      }
    },
    setMyMarketsTab: (state, action: PayloadAction<LenderMyMarketsTab>) => {
      state.myMarketsTab = action.payload
      state.marketSection =
        action.payload === LenderMyMarketsTab.TERMINATED
          ? LenderMarketDashboardSections.TERMINATED
          : LenderMarketDashboardSections.ACTIVE
    },
    setAllMarketsTab: (state, action: PayloadAction<LenderAllMarketsTab>) => {
      state.allMarketsTab = action.payload
    },
    setScrollTarget: (state, action: PayloadAction<string | null>) => {
      state.scrollTarget = action.payload
    },
    setShowFullFunctionality: (state, action: PayloadAction<boolean>) => {
      state.showFullFunctionality = action.payload
    },
    resetMarketSection: (state) => {
      state.marketSection = initialState.marketSection
      state.myMarketsTab = initialState.myMarketsTab
    },
    resetOtherSectionTabs: (state, action: PayloadAction<LenderSection>) => {
      if (action.payload !== LenderSection.MY_MARKETS) {
        state.marketSection = initialState.marketSection
        state.myMarketsTab = initialState.myMarketsTab
      }
      if (action.payload !== LenderSection.ALL_MARKETS) {
        state.allMarketsTab = initialState.allMarketsTab
      }
    },
    resetLenderDashboard: () => initialState,
  },
})

export const {
  setMarketSection,
  setMyMarketsTab,
  setAllMarketsTab,
  setScrollTarget,
  setShowFullFunctionality,
  resetMarketSection,
  resetOtherSectionTabs,
  resetLenderDashboard,
} = lenderDashboardSlice.actions
export default lenderDashboardSlice.reducer
