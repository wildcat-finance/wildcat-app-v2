import {
  CreateMarketFlowVariant,
  CreateMarketFlowVariantKey,
} from "./interface"
import { legacyCreateMarketFlowVariant } from "./legacy"
import { revolvingCreateMarketFlowVariant } from "./revolving"

const CREATE_MARKET_FLOW_VARIANTS: Record<
  CreateMarketFlowVariantKey,
  CreateMarketFlowVariant
> = {
  legacy: legacyCreateMarketFlowVariant,
  revolving: revolvingCreateMarketFlowVariant,
}

export const getCreateMarketFlowVariant = (
  implementationType: string | undefined,
): CreateMarketFlowVariant => {
  if (
    implementationType &&
    Object.prototype.hasOwnProperty.call(
      CREATE_MARKET_FLOW_VARIANTS,
      implementationType,
    )
  ) {
    return CREATE_MARKET_FLOW_VARIANTS[
      implementationType as CreateMarketFlowVariantKey
    ]
  }

  return CREATE_MARKET_FLOW_VARIANTS.legacy
}
