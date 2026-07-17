import {
  getSubgraphClient,
  isSupportedChainId,
  SubgraphDeploymentRequirementsByChain,
} from "@wildcatfi/wildcat-sdk"

export const getConfiguredSubgraphClient = (chainId: number | undefined) => {
  if (chainId === undefined || !isSupportedChainId(chainId)) return undefined
  return getSubgraphClient(chainId)
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
