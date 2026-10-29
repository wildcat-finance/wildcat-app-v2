export const MIN_AVAILABLE_LIQUIDITY_USD = 10_000
export const THIN_LIQUIDITY_USD = 20_000
export const MAX_DATA_AGE_SEC = 3 * 60 * 60
export const MIN_AFFILIATED_SHARE = 0.5

export const CACHE_TTL_MS = 5 * 60 * 1000
export const FAILURE_BACKOFF_MS = 60 * 1000
// How long the edge may keep serving a response while it refetches it in the
// background. Rows already carry a few minutes of age and expire after
// MAX_DATA_AGE_SEC, so this stays well inside that window.
export const EDGE_STALE_WHILE_REVALIDATE_SEC = 30 * 60
export const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000
export const UPSTREAM_TIMEOUT_MS = 10_000
