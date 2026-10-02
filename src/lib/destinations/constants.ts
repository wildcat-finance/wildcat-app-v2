export const DESTINATIONS_ENABLED =
  process.env.NEXT_PUBLIC_DESTINATIONS_ENABLED === "true"

export const MORPHO_CHAIN_IDS = [1] as const

export const MORPHO_API_URL = "https://api.morpho.org/graphql"

export const MORPHO_BLUE_ADDRESS: Record<number, `0x${string}`> = {
  1: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
}

export const MORPHO_APP_CHAIN_SLUG: Record<number, string> = {
  1: "ethereum",
}

export const MIN_CURATED_SUPPLY_USD = 100_000
export const MIN_CURATED_SHARE = 0.5
export const MIN_AVAILABLE_LIQUIDITY_USD = 10_000
export const MAX_DATA_AGE_SEC = 3 * 60 * 60
export const MIN_AFFILIATED_SHARE = 0.5

export const THIN_LIQUIDITY_USD = 20_000

export const CACHE_TTL_MS = 5 * 60 * 1000
export const FAILURE_BACKOFF_MS = 60 * 1000
export const UPSTREAM_TIMEOUT_MS = 10_000
