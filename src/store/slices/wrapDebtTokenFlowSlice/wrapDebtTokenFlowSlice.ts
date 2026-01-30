import { createSlice } from "@reduxjs/toolkit"

export enum WrapDebtTokenFlowSteps {
  NO_WRAPPER = "no-wrapper",
  CREATE_WRAPPER = "create-wrapper",
  HAS_WRAPPER = "has-wrapper",
}

export type WrapDebtTokenFlowType = {
  step: WrapDebtTokenFlowSteps
}

const initialState: WrapDebtTokenFlowType = {
  step: WrapDebtTokenFlowSteps.NO_WRAPPER,
}

const wrapDebtTokenFlowSlice = createSlice({
  name: "wrapDebtTokenFlow",
  initialState,
  reducers: {
    setTokenWrapperStep: (state, action) => {
      state.step = action.payload
    },
  },
})

export const { setTokenWrapperStep } = wrapDebtTokenFlowSlice.actions

export default wrapDebtTokenFlowSlice.reducer
