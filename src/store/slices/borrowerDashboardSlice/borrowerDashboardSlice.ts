import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export enum BorrowerDashboardSections {
  MARKETS = "markets",
  POLICIES = "policies",
  LENDERS = "lenders",
}

export enum BorrowerMarketDashboardSections {
  YOUR = "your",
  OTHER = "other",
}

export enum BorrowerMarketDashboardTabs {
  DEPOSITED = "deposited",
  NON_DEPOSITED = "non-deposited",
  TERMINATED = "terminated",
  SELF_ONBOARD = "self-onboard",
  MANUAL = "manual",
  OTHER_TERMINATED = "other-terminated",
}

export const BORROWER_MARKET_SECTION_TABS: Record<
  BorrowerMarketDashboardSections,
  BorrowerMarketDashboardTabs[]
> = {
  [BorrowerMarketDashboardSections.YOUR]: [
    BorrowerMarketDashboardTabs.DEPOSITED,
    BorrowerMarketDashboardTabs.NON_DEPOSITED,
    BorrowerMarketDashboardTabs.TERMINATED,
  ],
  [BorrowerMarketDashboardSections.OTHER]: [
    BorrowerMarketDashboardTabs.SELF_ONBOARD,
    BorrowerMarketDashboardTabs.MANUAL,
    BorrowerMarketDashboardTabs.OTHER_TERMINATED,
  ],
}

const getSectionFirstTab = (section: BorrowerMarketDashboardSections) =>
  BORROWER_MARKET_SECTION_TABS[section][0]

const getTabSection = (tab: BorrowerMarketDashboardTabs) =>
  BORROWER_MARKET_SECTION_TABS[BorrowerMarketDashboardSections.OTHER].includes(
    tab,
  )
    ? BorrowerMarketDashboardSections.OTHER
    : BorrowerMarketDashboardSections.YOUR

export type BorrowerDashboardType = {
  section: BorrowerDashboardSections
  marketSection: BorrowerMarketDashboardSections
  marketTab: BorrowerMarketDashboardTabs
  showFullFunctionality: boolean
}

const initialState: BorrowerDashboardType = {
  section: BorrowerDashboardSections.MARKETS,
  marketSection: BorrowerMarketDashboardSections.YOUR,
  marketTab: BorrowerMarketDashboardTabs.DEPOSITED,
  showFullFunctionality: false,
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
      if (state.marketSection === action.payload) return
      state.marketSection = action.payload
      state.marketTab = getSectionFirstTab(action.payload)
    },
    setMarketTab: (
      state,
      action: PayloadAction<BorrowerMarketDashboardTabs>,
    ) => {
      state.marketTab = action.payload
      state.marketSection = getTabSection(action.payload)
    },
    setShowFullFunctionality: (state, action: PayloadAction<boolean>) => {
      state.showFullFunctionality = action.payload
    },
    resetMarketSection: (state) => {
      state.marketSection = initialState.marketSection
      state.marketTab = initialState.marketTab
    },
    resetBorrowerDashboard: () => initialState,
  },
})

export const {
  setSection,
  setMarketSection,
  setMarketTab,
  setShowFullFunctionality,
  resetMarketSection,
  resetBorrowerDashboard,
} = borrowerDashboardSlice.actions
export default borrowerDashboardSlice.reducer
