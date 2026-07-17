import { MobileMarketCard } from "@/components/Mobile/MobileMarketCard"

import { MarketImplementationVariant } from "./interface"

export const standardMarketImplementationVariant: MarketImplementationVariant =
  {
    key: "standard",
    aprCopy: {
      configuredAprLabelKey: "borrowerMarketDetails.parameters.baseAPR",
      configuredAprTooltip:
        "The fixed annual percentage rate (excluding any protocol fees) that borrowers pay to lenders for assets within the market.",
      protocolAprTooltip:
        "An additional APR that accrues to the protocol by slowly increasing required reserves. Derived by the fee configuration of the protocol as a percentage of the current base APR.",
      effectiveLenderAprTooltip:
        "The current interest rate being paid to lenders: the base APR plus penalty APR if applicable.",
      getConfiguredAprValueTooltip: () => undefined,
      adjustAprLabelKey: "borrowerMarketDetails.modals.apr.adjustBase",
      alreadyUpdatedLabelKey: "borrowerMarketDetails.modals.apr.alreadyUpdated",
      currentAprLabelKey: "borrowerMarketDetails.modals.apr.currentBaseApr",
      newAprLabelKey: "borrowerMarketDetails.modals.apr.newBaseApr",
    },
    MarketCard: MobileMarketCard,
  }
