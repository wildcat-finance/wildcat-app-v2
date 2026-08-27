export const POLLING_INTERVALS = {
  fast: 10_000,
  default: 30_000,
  slow: 60_000,
} as const

// Backwards-compatible alias for consumers that predate the interval map.
export const POLLING_INTERVAL = POLLING_INTERVALS.fast
