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
      description: t("common.labels.maximumLimitFundsBorrowersCan"),
    },
    {
      title: t("common.fields.utilizationApr"),
      description: t(
        "borrower.createMarket.financial.baseAPR.glossaryRevolving",
      ),
    },
    {
      title: t("common.fields.penaltyApr"),
      description: t("borrower.createMarket.financial.penaltyAPR.glossary"),
    },
    {
      title: t("common.fields.reserveRatio"),
      description: t("common.labels.requiredPercentageMarketFundsMust"),
    },
    {
      title: t("borrower.createMarket.financial.commitmentFee.label"),
      description: t("borrower.createMarket.financial.commitmentFee.glossary"),
    },
    {
      title: t("borrower.createMarket.periods.grace.label"),
      description: t("common.labels.durationBorrowersHaveResolveReserve"),
    },
    {
      title: t("common.fields.withdrawalCycleDuration"),
      description: t("common.labels.fixedPeriodDuringWhichWithdrawal"),
    },
    {
      title: t("common.fields.minimumDeposit"),
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
