import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

export const MORPHO_API_URL = "https://api.morpho.org/graphql"

export const MORPHO_DEPLOYMENTS: Partial<
  Record<SupportedChainId, { appSlug: string }>
> = {
  [SupportedChainId.Mainnet]: { appSlug: "ethereum" },
}

export const MIN_CURATED_SUPPLY_USD = 100_000
export const MIN_CURATED_SHARE = 0.5
