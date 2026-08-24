import * as React from "react"

import { Divider } from "@mui/material"
import { useTranslation } from "react-i18next"

import { ParametersItem } from "@/components/ParametersItem"
import { formatBps, MARKET_PARAMS_DECIMALS } from "@/utils/formatters"

import {
  ExtraParametersSectionProps,
  MarketImplementationVariant,
} from "./interface"
import { RevolvingMarketCard } from "./RevolvingMarketCard"

const RevolvingExtraParametersSection = ({
  aprDisplay,
}: ExtraParametersSectionProps) => {
  const { t } = useTranslation()

  return (
    <>
      <ParametersItem
        title={t("marketParameters.commitmentAPR")}
        value={
          aprDisplay.commitmentAprBips !== undefined
            ? `${formatBps(
                aprDisplay.commitmentAprBips,
                MARKET_PARAMS_DECIMALS.annualInterestBips,
              )}%`
            : "..."
        }
        tooltipText={t("common.labels.annualPercentageRateChargedUndrawn")}
      />
      <Divider sx={{ margin: "12px 0 12px" }} />
    </>
  )
}

export const revolvingMarketImplementationVariant: MarketImplementationVariant =
  {
    key: "revolving",
    aprCopy: {
      configuredAprLabelKey: "common.fields.utilizationApr",
      configuredAprTooltip:
        "The annual percentage rate charged on drawn capital in a revolving market. Undrawn deposited capital accrues the separate commitment APR instead.",
      protocolAprTooltip:
        "An additional APR that accrues to the protocol as a percentage of the market's current blended lender APR: commitment APR plus the utilization-weighted utilization APR.",
      effectiveLenderAprTooltip:
        "The current APR being paid to lenders across deposited capital: commitment APR on undrawn capital, plus utilization APR on drawn capital, plus penalty APR if applicable.",
      getConfiguredAprValueTooltip: (aprDisplay) =>
        aprDisplay.utilizationBips !== undefined
          ? `Current utilization: ${formatBps(
              aprDisplay.utilizationBips,
              MARKET_PARAMS_DECIMALS.reserveRatioBips,
            )}% of deposited capital is drawn.`
          : undefined,
      adjustAprLabelKey: "marketDetails.borrower.modals.apr.adjustUtilization",
      alreadyUpdatedLabelKey:
        "marketDetails.borrower.modals.apr.alreadyUpdatedUtilization",
      currentAprLabelKey:
        "marketDetails.borrower.modals.apr.currentUtilizationApr",
      newAprLabelKey: "marketDetails.borrower.modals.apr.newUtilizationApr",
      proposedAprLabelKey:
        "marketDetails.borrower.modals.apr.proposedUtilizationApr",
    },
    ExtraParametersSection: RevolvingExtraParametersSection,
    MarketCard: RevolvingMarketCard,
  }
