export const METRIC_BASIS = {
  liveToken:
    "Live token amount from market/account lens data; not USD-converted.",
  historicalUsd:
    "Historical/indexed USD aggregate using the price basis stored by analytics.",
  currentUsd:
    "Latest-price USD estimate using the most recent available token price.",
  analyticsDebtUsd:
    "Analytics USD debt snapshot; compare to market pages only after converting live token debt to the same USD basis.",
} as const

export type MetricBasis = keyof typeof METRIC_BASIS
