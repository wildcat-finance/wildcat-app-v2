import { MobileMarketCard } from "@/components/Mobile/MobileMarketCard"

import { MarketImplementationVariant } from "./interface"

export const standardMarketImplementationVariant: MarketImplementationVariant =
  {
    key: "standard",
    aprCopy: {
      configuredAprLabelKey: "marketParameters.baseAPR",
      configuredAprTooltip:
        "The fixed annual percentage rate (excluding any protocol fees) that borrowers pay to lenders for assets within the market.",
      protocolAprTooltip:
        "An additional APR that accrues to the protocol by slowly increasing required reserves. Derived by the fee configuration of the protocol as a percentage of the current base APR.",
      effectiveLenderAprTooltip:
        "The current interest rate being paid to lenders: the base APR plus penalty APR if applicable.",
      getConfiguredAprValueTooltip: () => undefined,
      adjustAprLabelKey: "marketDetails.borrower.modals.apr.adjustBase",
      alreadyUpdatedLabelKey:
        "marketDetails.borrower.modals.apr.alreadyUpdated",
      currentAprLabelKey: "marketDetails.borrower.modals.apr.currentBaseApr",
      newAprLabelKey: "marketDetails.borrower.modals.apr.newBaseApr",
    },
    MarketCard: MobileMarketCard,
  }
