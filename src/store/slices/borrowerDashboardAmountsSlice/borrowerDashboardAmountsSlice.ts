import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import {
  BorrowerDashboardSections,
  BorrowerMarketDashboardSections,
} from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"

export type BorrowerDashboardAmountsType = {
  defaulted: number
  deposited: number
  nonDeposited: number
  prevActive: number
  neverActive: number
  selfOnboard: number
  manual: number
  terminatedOther: number
  defaultedOther: number
  policies: number
}

export const initialState: BorrowerDashboardAmountsType = {
  defaulted: 0,
  deposited: 0,
  nonDeposited: 0,
  prevActive: 0,
  neverActive: 0,
  selfOnboard: 0,
  manual: 0,
  terminatedOther: 0,
  defaultedOther: 0,
  policies: 0,
}

const borrowerDashboardAmountsSlice = createSlice({
  name: "borrowerDashboardAmounts",
  initialState,
  reducers: {
    setSectionAmount: (
      state,
      action: PayloadAction<{
        name: keyof BorrowerDashboardAmountsType
        value: number
      }>,
    ) => {
      const { name, value } = action.payload
      state[name] = value
    },
  },
})

export const { setSectionAmount } = borrowerDashboardAmountsSlice.actions
export default borrowerDashboardAmountsSlice.reducer
