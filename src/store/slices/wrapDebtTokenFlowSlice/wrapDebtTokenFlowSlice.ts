import { createSlice } from "@reduxjs/toolkit"

export enum WrapDebtTokenFlowSteps {
  NO_WRAPPER = "no-wrapper",
  HAS_WRAPPER = "has-wrapper",
}

export type WrapDebtTokenFlowType = {
  step: WrapDebtTokenFlowSteps
  initialAmount: number
  wrappedAmount: number
}

const initialState: WrapDebtTokenFlowType = {
  step: WrapDebtTokenFlowSteps.NO_WRAPPER,
  initialAmount: 200,
  wrappedAmount: 0,
}

const wrapDebtTokenFlowSlice = createSlice({
  name: "wrapDebtTokenFlow",
  initialState,
  reducers: {
    setTokenWrapperStep: (state, action) => {
      state.step = action.payload
    },
    setWrappedAmount: (state, action) => {
      state.wrappedAmount = action.payload
    },
    setInitialAmount: (state, action) => {
      state.initialAmount = action.payload
    },
  },
})

export const { setTokenWrapperStep, setWrappedAmount, setInitialAmount } =
  wrapDebtTokenFlowSlice.actions

export default wrapDebtTokenFlowSlice.reducer
