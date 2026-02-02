import { createSlice } from "@reduxjs/toolkit"

export enum WrapDebtTokenFlowSteps {
  NO_WRAPPER = "no-wrapper",
  HAS_WRAPPER = "has-wrapper",
}

export type WrapDebtTokenFlowType = {
  step: WrapDebtTokenFlowSteps
  isMobileOpenedState: boolean
}

const initialState: WrapDebtTokenFlowType = {
  step: WrapDebtTokenFlowSteps.NO_WRAPPER,
  isMobileOpenedState: false,
}

const wrapDebtTokenFlowSlice = createSlice({
  name: "wrapDebtTokenFlow",
  initialState,
  reducers: {
    setIsMobileOpenedState: (state, action) => {
      state.isMobileOpenedState = action.payload
    },
  },
})

export const { setIsMobileOpenedState } = wrapDebtTokenFlowSlice.actions

export default wrapDebtTokenFlowSlice.reducer
