export const STEPS_NAME = {
  borrowerMarketList: "borrowerMarketList",
  marketDescription: "marketDescription",
  legalInformation: "legalInformation",
  confirmation: "confirmation",
}

export const newMarketSteps = {
  marketDescription: {
    name: STEPS_NAME.marketDescription,
    previousStep: "",
    nextStep: STEPS_NAME.legalInformation,
  },
  legalInformation: {
    name: STEPS_NAME.legalInformation,
    previousStep: STEPS_NAME.marketDescription,
    nextStep: STEPS_NAME.confirmation,
  },
  confirmation: {
    name: STEPS_NAME.confirmation,
    previousStep: STEPS_NAME.legalInformation,
    nextStep: "",
  },
}
