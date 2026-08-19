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
          title: t("borrower.createMarket.policy.title"),
          description: t("borrower.createMarket.policy.policy.glossary"),
        },
        {
          title: t("common.fields.policyName"),
          description: t("borrower.createMarket.policy.name.glossary"),
        },
      ]
      if (marketType === "periodicTerm") {
        items.push(
          {
            title: t(
              "borrower.createMarket.policy.periodic.firstWindowStart.label",
            ),
            description: t(
              "marketParameters.periodicTerm.firstWindowStartTooltip",
            ),
          },
          {
            title: t("common.fields.withdrawalPeriod"),
            description: t(
              "borrower.createMarket.policy.periodic.periodDuration.glossary",
            ),
          },
          {
            title: t("common.fields.withdrawalWindow"),
            description: t(
              "borrower.createMarket.policy.periodic.withdrawalWindowDuration.glossary",
            ),
          },
        )
      } else if (marketType === "fixedTerm") {
        items.push(
          {
            title: t("borrower.createMarket.policy.expiration.label"),
            description: t("borrower.createMarket.policy.expiration.glossary"),
          },
          {
            title: t("borrower.createMarket.policy.earlyClose.label"),
            description: t("borrower.createMarket.policy.earlyClose.explainer"),
          },
          {
            title: t("borrower.createMarket.policy.reduceExpiration.label"),
            description: t(
              "borrower.createMarket.policy.reduceExpiration.explainer",
            ),
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
          title: t("common.fields.marketTokenSymbol"),
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
            "borrower.createMarket.lenderRestrictions.restrictWithdrawals.label",
          ),
          description: t(
            "borrower.createMarket.lenderRestrictions.restrictWithdrawals.glossary",
          ),
        },
        {
          title: t(
            "borrower.createMarket.lenderRestrictions.restrictTransfers.label",
          ),
          description: t(
            "borrower.createMarket.lenderRestrictions.restrictTransfers.glossary",
          ),
        },
        {
          title: t(
            "borrower.createMarket.lenderRestrictions.disableTransfers.label",
          ),
          description: t(
            "borrower.createMarket.lenderRestrictions.disableTransfers.glossary",
          ),
        },
      ]
    default:
      return []
  }
}
