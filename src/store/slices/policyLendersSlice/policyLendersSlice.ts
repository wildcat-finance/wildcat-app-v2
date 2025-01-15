import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import { LendersItem } from "@/app/[locale]/borrower/policy/components/LendersTab/interface"

export type PolicyLendersType = {
  policyName: string
  initialLenders: LendersItem[]
  lenders: LendersItem[]
}

const initialState: PolicyLendersType = {
  policyName: "",
  initialLenders: [],
  lenders: [],
}

const policyLendersSlice = createSlice({
  name: "policyLenders",
  initialState,
  reducers: {
    setPolicyName: (state, action: PayloadAction<string>) => {
      state.policyName = action.payload
    },
    setInitialPolicyLenders: (state, action: PayloadAction<LendersItem[]>) => {
      state.initialLenders = action.payload
    },
    setPolicyLenders: (state, action: PayloadAction<LendersItem[]>) => {
      state.lenders = action.payload
    },
    resetPolicyName: (state) => {
      state.policyName = initialState.policyName
    },
    resetPolicyLendersState: () => initialState,
  },
})

export const {
  setPolicyName,
  setInitialPolicyLenders,
  setPolicyLenders,
  resetPolicyName,
  resetPolicyLendersState,
} = policyLendersSlice.actions

export default policyLendersSlice.reducer
