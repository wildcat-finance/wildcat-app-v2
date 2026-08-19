import { TFunction } from "i18next"

import { CreateMarketSteps } from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"

import { getSharedGlossaryItems } from "./glossary"
import { CreateMarketFlowVariant } from "./interface"
import { RevolvingConfirmationForm } from "../components/Forms/ConfirmationForm/RevolvingConfirmationForm"
import { RevolvingFinancialForm } from "../components/Forms/FinancialForm/RevolvingFinancialForm"
import { GlossaryItem } from "../components/GlossarySidebar/interface"

const getGlossaryItems = (
  step: CreateMarketSteps,
  t: TFunction,
  marketType?: string,
): GlossaryItem[] => {
  const sharedItems = getSharedGlossaryItems(step, t, marketType)
  if (sharedItems) return sharedItems

  return [
    {
      title: t("borrower.createMarket.financial.maxCapacity.label"),
      description: t("createNewMarket.financial.maxCapacity.glossary"),
    },
    {
      title: t("createNewMarket.financial.baseAPR.labelRevolving"),
      description: t("createNewMarket.financial.baseAPR.glossaryRevolving"),
    },
    {
      title: t("borrower.createMarket.financial.penaltyAPR.label"),
      description: t("borrower.createMarket.financial.penaltyAPR.glossary"),
    },
    {
      title: t("borrower.createMarket.financial.ratio.label"),
      description: t("borrower.createMarket.financial.ratio.glossary"),
    },
    {
      title: t("createNewMarket.financial.commitmentFee.label"),
      description: t("createNewMarket.financial.commitmentFee.glossary"),
    },
    {
      title: t("borrower.createMarket.periods.grace.label"),
      description: t("borrower.createMarket.periods.grace.glossary"),
    },
    {
      title: t("borrower.createMarket.periods.wdCycle.label"),
      description: t("borrower.createMarket.periods.wdCycle.glossary"),
    },
    {
      title: t("borrower.createMarket.financial.minDeposit.label"),
      description: t("borrower.createMarket.financial.minDeposit.glossary"),
    },
  ]
}

export const revolvingCreateMarketFlowVariant: CreateMarketFlowVariant = {
  key: "revolving",
  FinancialForm: RevolvingFinancialForm,
  ConfirmationForm: RevolvingConfirmationForm,
  getGlossaryItems,
}
