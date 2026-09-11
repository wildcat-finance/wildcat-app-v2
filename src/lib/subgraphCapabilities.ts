import {
  isSupportedChainId,
  SubgraphDeploymentRequirementsByChain,
} from "@wildcatfi/wildcat-sdk"

import { getBrowserSubgraphClient } from "@/lib/subgraph/client"

export const getConfiguredSubgraphClient = (chainId: number | undefined) => {
  if (chainId === undefined || !isSupportedChainId(chainId)) return undefined
  return getBrowserSubgraphClient(chainId)
}

export const isSubgraphAnalyticsConfigured = (
  chainId: number | undefined,
): boolean =>
  chainId !== undefined &&
  isSupportedChainId(chainId) &&
  SubgraphDeploymentRequirementsByChain[chainId].analyticsEnabled

export const isSubgraphPricingConfigured = (
  chainId: number | undefined,
): boolean => {
  if (chainId === undefined || !isSupportedChainId(chainId)) return false
  const { analyticsEnabled, pricingMode } =
    SubgraphDeploymentRequirementsByChain[chainId]
  return analyticsEnabled && pricingMode !== "none"
}
