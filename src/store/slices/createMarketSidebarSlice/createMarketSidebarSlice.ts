import { PayloadAction, createSlice } from "@reduxjs/toolkit"

export enum CreateMarketSteps {
  POLICY = "policy",
  BASIC = "basicSetup",
  MLA = "mla",
  FINANCIAL = "financialTerms",
  LRESTRICTIONS = "lenderRestrictions",
  BRESTRICTIONS = "borrowerRestrictions",
  PERIODS = "periods",
  CONFIRM = "confirmation",
}

export type CreateMarketSidebarSliceType = {
  currentStep: CreateMarketSteps
  steps: {
    number?: number
    title: string
    disabled: boolean
    valid?: boolean
    step: CreateMarketSteps
  }[]
}

const initialState: CreateMarketSidebarSliceType = {
  currentStep: CreateMarketSteps.POLICY,
  steps: [
    {
      number: 1,
      title: "Market Policy",
      disabled: false,
      valid: false,
      step: CreateMarketSteps.POLICY,
    },
    {
      number: 2,
      title: "Basic Market Setup",
      disabled: true,
      valid: false,
      step: CreateMarketSteps.BASIC,
    },
    // {
    //   number: 3,
    //   title: "Loan Agreement",
    //   disabled: true,
    //   valid: false,
    //   step: CreateMarketSteps.MLA,
    // },
    {
      // number: 4,
      number: 3,
      title: "Financial Terms",
      disabled: true,
      valid: false,
      step: CreateMarketSteps.FINANCIAL,
    },
    {
      // number: 5,
      number: 4,
      title: "Lender Restrictions",
      disabled: true,
      valid: false,
      step: CreateMarketSteps.LRESTRICTIONS,
    },
    {
      // number: 6,
      number: 5,
      title: "Borrower Restrictions",
      disabled: true,
      valid: false,
      step: CreateMarketSteps.BRESTRICTIONS,
    },
    {
      // number: 7,
      number: 6,
      title: "Grace, Withdrawal Periods",
      disabled: true,
      valid: false,
      step: CreateMarketSteps.PERIODS,
    },
    {
      number: undefined,
      title: "Confirmation",
      disabled: true,
      valid: false,
      step: CreateMarketSteps.CONFIRM,
    },
  ],
}

const createMarketSidebarSlice = createSlice({
  name: "createMarketSidebar",
  initialState,
  reducers: {
    setCreatingStep: (state, action: PayloadAction<CreateMarketSteps>) => {
      state.currentStep = action.payload
    },
    setIsValid: (
      state,
      action: PayloadAction<{ step: CreateMarketSteps; valid: boolean }>,
    ) => {
      const step = state.steps.find((s) => s.step === action.payload.step)
      if (step) {
        step.valid = action.payload.valid
      }
    },
    setIsDisabled: (
      state,
      action: PayloadAction<{ steps: CreateMarketSteps[]; disabled: boolean }>,
    ) => {
      action.payload.steps.forEach((stepName) => {
        const step = state.steps.find((s) => s.step === stepName)
        if (step) {
          step.disabled = action.payload.disabled
        }
      })
    },
    setInitialCreateState: () => initialState,
  },
})

export const {
  setCreatingStep,
  setIsValid,
  setIsDisabled,
  setInitialCreateState,
} = createMarketSidebarSlice.actions

export default createMarketSidebarSlice.reducer
