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
      title: t("borrower.createMarket.financial.maxCapacity.label"),
      description: t("borrower.createMarket.financial.maxCapacity.glossary"),
    },
    {
      title: t("common.fields.baseApr"),
      description: t("borrower.createMarket.financial.baseAPR.glossary"),
    },
    {
      title: t("common.fields.penaltyApr"),
      description: t("borrower.createMarket.financial.penaltyAPR.glossary"),
    },
    {
      title: t("common.fields.reserveRatio"),
      description: t("borrower.createMarket.financial.ratio.glossary"),
    },
    {
      title: t("borrower.createMarket.periods.grace.label"),
      description: t("borrower.createMarket.periods.grace.glossary"),
    },
    {
      title: t("common.fields.withdrawalCycleDuration"),
      description: t("borrower.createMarket.periods.wdCycle.glossary"),
    },
    {
      title: t("common.fields.minimumDeposit"),
      description: t("borrower.createMarket.financial.minDeposit.glossary"),
    },
  ]
}

export const standardCreateMarketFlowVariant: CreateMarketFlowVariant = {
  key: "standard",
  FinancialForm: LegacyFinancialForm,
  ConfirmationForm: LegacyConfirmationForm,
  getGlossaryItems,
}
