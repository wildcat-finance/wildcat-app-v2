import { TFunction } from "i18next"

import { CreateMarketSteps } from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"

import { getSharedGlossaryItems } from "./glossary"
import { CreateMarketFlowVariant } from "./interface"
import { LegacyConfirmationForm } from "../components/Forms/ConfirmationForm/LegacyConfirmationForm"
import { LegacyFinancialForm } from "../components/Forms/FinancialForm/LegacyFinancialForm"
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
      title: t("createNewMarket.financial.maxCapacity.label"),
      description: t("createNewMarket.financial.maxCapacity.glossary"),
    },
    {
      title: t("createNewMarket.financial.baseAPR.label"),
      description: t("createNewMarket.financial.baseAPR.glossary"),
    },
    {
      title: t("createNewMarket.financial.penaltyAPR.label"),
      description: t("createNewMarket.financial.penaltyAPR.glossary"),
    },
    {
      title: t("createNewMarket.financial.ratio.label"),
      description: t("createNewMarket.financial.ratio.glossary"),
    },
    {
      title: t("createNewMarket.periods.grace.label"),
      description: t("createNewMarket.periods.grace.glossary"),
    },
    {
      title: t("createNewMarket.periods.wdCycle.label"),
      description: t("createNewMarket.periods.wdCycle.glossary"),
    },
    {
      title: t("createNewMarket.financial.minDeposit.label"),
      description: t("createNewMarket.financial.minDeposit.glossary"),
    },
  ]
}

export const standardCreateMarketFlowVariant: CreateMarketFlowVariant = {
  key: "standard",
  FinancialForm: LegacyFinancialForm,
  ConfirmationForm: LegacyConfirmationForm,
  getGlossaryItems,
}
