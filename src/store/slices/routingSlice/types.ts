type ScenarioSteps = {
  currentStep: string
  initStep: string
  steps: {
    [key: string]: {
      name: string
      previousStep: string | null
      nextStep: string | null
    }
  }
}

export type TFlowName = "newMarketFlow"

export type TRoutingType = {
  currentFlow: TFlowName | ""
  hideInfoStep?: boolean
  disableInfoStepSidebar?: boolean
  disableConfirmationStepSidebar?: boolean
  routes: {
    newMarketFlow: ScenarioSteps
  }
}
