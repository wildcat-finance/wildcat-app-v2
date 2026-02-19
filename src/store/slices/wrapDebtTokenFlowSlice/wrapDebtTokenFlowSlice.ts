import { createSlice } from "@reduxjs/toolkit"

export enum WrapDebtTokenFlowSteps {
  NO_WRAPPER = "no-wrapper",
  HAS_WRAPPER = "has-wrapper",
}

export enum WrapDebtTokenTab {
  WRAP = "wrap",
  UNWRAP = "unwrap",
}

export type WrapDebtTokenFlowType = {
  step: WrapDebtTokenFlowSteps
  isMobileOpenedState: boolean
  activeTab: WrapDebtTokenTab
}

const initialState: WrapDebtTokenFlowType = {
  step: WrapDebtTokenFlowSteps.NO_WRAPPER,
  isMobileOpenedState: false,
  activeTab: WrapDebtTokenTab.WRAP,
}

const wrapDebtTokenFlowSlice = createSlice({
  name: "wrapDebtTokenFlow",
  initialState,
  reducers: {
    setIsMobileOpenedState: (state, action) => {
      state.isMobileOpenedState = action.payload
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload
    },
  },
})

export const { setIsMobileOpenedState, setActiveTab } =
  wrapDebtTokenFlowSlice.actions

export default wrapDebtTokenFlowSlice.reducer
