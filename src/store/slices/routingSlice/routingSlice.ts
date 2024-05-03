"use client"

import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import { newMarketSteps } from "./flowsSteps"
import { TFlowName, TRoutingType } from "./types"

export const initialState: TRoutingType = {
  currentFlow: "",
  routes: {
    newMarketFlow: {
      currentStep: "",
      initStep: "lastTransfers",
      steps: newMarketSteps,
    },
  },
}

const routingSlice = createSlice({
  name: "routing",
  initialState,
  reducers: {
    setCurrentFlow: (state, action: PayloadAction<TFlowName | "">) => {
      state.currentFlow = action.payload
    },
    setCurrentStep: (state, action: PayloadAction<string>) => {
      state.routes[state.currentFlow as TFlowName].currentStep = action.payload
    },
    setNextStep: (state, action: PayloadAction<string | undefined>) => {
      const { nextStep } =
        state.routes[state.currentFlow as TFlowName].steps[
          state.routes[state.currentFlow as TFlowName].currentStep
        ]
      if (action.payload) {
        state.routes[state.currentFlow as TFlowName].currentStep =
          action.payload
        return
      }
      if (nextStep) {
        state.routes[state.currentFlow as TFlowName].currentStep = nextStep
      } else {
        state.routes[state.currentFlow as TFlowName].currentStep = ""
      }
    },
    setPreviousStep: (state) => {
      const { previousStep } =
        state.routes[state.currentFlow as TFlowName].steps[
          state.routes[state.currentFlow as TFlowName].currentStep
        ]
      if (previousStep) {
        state.routes[state.currentFlow as TFlowName].currentStep = previousStep
      } else {
        state.routes[state.currentFlow as TFlowName].currentStep = ""
      }
    },
    resetSteps: () => initialState,
  },
})

export const {
  setCurrentFlow,
  setCurrentStep,
  setNextStep,
  setPreviousStep,
  resetSteps,
} = routingSlice.actions

export default routingSlice.reducer
