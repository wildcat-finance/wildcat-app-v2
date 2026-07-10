import { ComponentType } from "react"

import { getMarketAprDisplayBips } from "@/utils/marketApr"
import { MarketImplementationType } from "@/utils/marketImplementation"

import { MobileMarketCardProps } from "../Mobile/MobileMarketCard"

export type MarketImplementationVariantKey = MarketImplementationType

export type MarketAprCopy = {
  configuredAprLabelKey: string
  configuredAprTooltip: string
  protocolAprTooltip: string
  effectiveLenderAprTooltip: string
  getConfiguredAprValueTooltip: (
    aprDisplay: ReturnType<typeof getMarketAprDisplayBips>,
  ) => string | undefined
  adjustAprLabelKey: string
  alreadyUpdatedLabelKey: string
  currentAprLabelKey: string
  newAprLabelKey: string
}

export type ExtraParametersSectionProps = {
  aprDisplay: ReturnType<typeof getMarketAprDisplayBips>
}

// Extension point for future implementation-specific copy and market-detail UI.
export type MarketImplementationVariant = {
  key: MarketImplementationVariantKey
  aprCopy: MarketAprCopy
  ExtraParametersSection?: ComponentType<ExtraParametersSectionProps>
  MarketCard: ComponentType<MobileMarketCardProps>
}
