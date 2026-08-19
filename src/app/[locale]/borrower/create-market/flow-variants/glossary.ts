import { TFunction } from "i18next"

import { CreateMarketSteps } from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"

import { GlossaryItem } from "../components/GlossarySidebar/interface"

export const getSharedGlossaryItems = (
  step: CreateMarketSteps,
  t: TFunction,
  marketType?: string,
): GlossaryItem[] | undefined => {
  switch (step) {
    case CreateMarketSteps.POLICY: {
      const items = [
        {
          title: t("borrower.createMarket.policy.policy.label"),
          description: t("borrower.createMarket.policy.policy.glossary"),
        },
        {
          title: t("borrower.createMarket.policy.name.label"),
          description: t("borrower.createMarket.policy.name.glossary"),
        },
      ]
      if (marketType === "periodicTerm") {
        items.push(
          {
            title: t("createNewMarket.policy.periodic.firstWindowStart.label"),
            description: t(
              "createNewMarket.policy.periodic.firstWindowStart.glossary",
            ),
          },
          {
            title: t("createNewMarket.policy.periodic.periodDuration.label"),
            description: t(
              "createNewMarket.policy.periodic.periodDuration.glossary",
            ),
          },
          {
            title: t(
              "createNewMarket.policy.periodic.withdrawalWindowDuration.label",
            ),
            description: t(
              "createNewMarket.policy.periodic.withdrawalWindowDuration.glossary",
            ),
          },
        )
      } else if (marketType === "fixedTerm") {
        items.push(
          {
            title: t("borrower.createMarket.policy.expiration.label"),
            description: t("createNewMarket.policy.expiration.glossary"),
          },
          {
            title: t("borrower.createMarket.policy.earlyClose.label"),
            description: t("borrower.createMarket.policy.earlyClose.explainer"),
          },
          {
            title: t("borrower.createMarket.policy.reduceExpiration.label"),
            description: t("createNewMarket.policy.reduceExpiration.explainer"),
          },
        )
      }
      return items
    }
    case CreateMarketSteps.BASIC:
      return [
        {
          title: t("common.fields.underlyingAsset"),
          description: t("borrower.createMarket.basic.asset.glossary"),
        },
        {
          title: t("borrower.createMarket.basic.tokenName.label"),
          description: t("borrower.createMarket.basic.tokenName.glossary"),
        },
        {
          title: t("borrower.createMarket.basic.tokenSymbol.label"),
          description: t("borrower.createMarket.basic.tokenSymbol.glossary"),
        },
      ]
    case CreateMarketSteps.MLA:
      return [
        {
          title: t("borrower.createMarket.mla.mla.label"),
          description: t("borrower.createMarket.mla.mla.glossary"),
        },
      ]
    case CreateMarketSteps.FINANCIAL:
      return undefined
    case CreateMarketSteps.LRESTRICTIONS:
      return [
        {
          title: t(
            "createNewMarket.lenderRestrictions.restrictWithdrawals.label",
          ),
          description: t(
            "createNewMarket.lenderRestrictions.restrictWithdrawals.glossary",
          ),
        },
        {
          title: t(
            "createNewMarket.lenderRestrictions.restrictTransfers.label",
          ),
          description: t(
            "createNewMarket.lenderRestrictions.restrictTransfers.glossary",
          ),
        },
        {
          title: t("createNewMarket.lenderRestrictions.disableTransfers.label"),
          description: t(
            "createNewMarket.lenderRestrictions.disableTransfers.glossary",
          ),
        },
      ]
    default:
      return []
  }
}
