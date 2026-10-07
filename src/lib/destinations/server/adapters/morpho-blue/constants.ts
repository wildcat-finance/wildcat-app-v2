import type { Address } from "viem"

export const MORPHO_API_URL = "https://api.morpho.org/graphql"

export const MORPHO_DEPLOYMENTS: Record<
  number,
  { blue: Address; appSlug: string }
> = {
  1: {
    blue: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
    appSlug: "ethereum",
  },
}

export const MIN_CURATED_SUPPLY_USD = 100_000
export const MIN_CURATED_SHARE = 0.5
