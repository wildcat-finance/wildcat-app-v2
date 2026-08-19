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
          title: t("createNewMarket.policy.policy.label"),
          description: t("createNewMarket.policy.policy.glossary"),
        },
        {
          title: t("createNewMarket.policy.name.label"),
          description: t("createNewMarket.policy.name.glossary"),
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
            title: t("createNewMarket.policy.expiration.label"),
            description: t("createNewMarket.policy.expiration.glossary"),
          },
          {
            title: t("createNewMarket.policy.earlyClose.label"),
            description: t("createNewMarket.policy.earlyClose.explainer"),
          },
          {
            title: t("createNewMarket.policy.reduceExpiration.label"),
            description: t("createNewMarket.policy.reduceExpiration.explainer"),
          },
        )
      }
      return items
    }
    case CreateMarketSteps.BASIC:
      return [
        {
          title: t("createNewMarket.basic.asset.label"),
          description: t("createNewMarket.basic.asset.glossary"),
        },
        {
          title: t("createNewMarket.basic.tokenName.label"),
          description: t("createNewMarket.basic.tokenName.glossary"),
        },
        {
          title: t("createNewMarket.basic.tokenSymbol.label"),
          description: t("createNewMarket.basic.tokenSymbol.glossary"),
        },
      ]
    case CreateMarketSteps.MLA:
      return [
        {
          title: t("createNewMarket.mla.mla.label"),
          description: t("createNewMarket.mla.mla.glossary"),
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
