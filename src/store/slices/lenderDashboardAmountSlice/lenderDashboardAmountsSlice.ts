import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export type LenderDashboardAmountsType = {
  deposited: number
  nonDeposited: number
  prevActive: number
  neverActive: number
  selfOnboard: number
  manual: number
}

export const initialState: LenderDashboardAmountsType = {
  deposited: 0,
  nonDeposited: 0,
  prevActive: 0,
  neverActive: 0,
  selfOnboard: 0,
  manual: 0,
}

const lenderDashboardAmountsSlice = createSlice({
  name: "lenderDashboardAmounts",
  initialState,
  reducers: {
    setLendersSectionAmount: (
      state,
      action: PayloadAction<{
        name: keyof LenderDashboardAmountsType
        value: number
      }>,
    ) => {
      const { name, value } = action.payload
      state[name] = value
    },
  },
})

export const { setLendersSectionAmount } = lenderDashboardAmountsSlice.actions
export default lenderDashboardAmountsSlice.reducer
