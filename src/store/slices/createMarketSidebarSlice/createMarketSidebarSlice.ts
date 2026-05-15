import { PayloadAction, createSlice } from "@reduxjs/toolkit"

export enum CreateMarketSteps {
  POLICY = "policy",
  BASIC = "basicSetup",
  FINANCIAL = "financialTerms",
  BRESTRICTIONS = "borrowerRestrictions",
  LRESTRICTIONS = "lenderRestrictions",
  PERIODS = "periods",
  WRAPPER = "wrapper",
  MLA = "mla",
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
      title: "borrower.createMarket.policy.title",
      disabled: false,
      valid: false,
      step: CreateMarketSteps.POLICY,
    },
    {
      number: 2,
      title: "borrower.createMarket.basic.title",
      disabled: true,
      valid: false,
      step: CreateMarketSteps.BASIC,
    },
    {
      number: 3,
      title: "borrower.createMarket.financial.title",
      disabled: true,
      valid: false,
      step: CreateMarketSteps.FINANCIAL,
    },
    {
      number: 4,
      title: "borrower.createMarket.lenderRestrictions.title",
      disabled: true,
      valid: false,
      step: CreateMarketSteps.LRESTRICTIONS,
    },
    {
      number: 5,
      title: "borrower.createMarket.wrapper.title",
      disabled: true,
      valid: false,
      step: CreateMarketSteps.WRAPPER,
    },
    {
      number: 6,
      title: "borrower.createMarket.mla.title",
      disabled: true,
      valid: false,
      step: CreateMarketSteps.MLA,
    },
    {
      number: undefined,
      title: "borrower.createMarket.confirm.title",
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
