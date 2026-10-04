export const METRIC_BASIS = {
  liveToken:
    "Live token amount from market/account lens data; not USD-converted.",
  indexedToken: "Indexed token amount from protocol events; not USD-converted.",
  historicalUsd:
    "Historical/indexed USD aggregate using the price basis stored by analytics.",
  currentUsd:
    "Latest-price USD estimate using the most recent available token price.",
  analyticsDebtUsd:
    "USD value of debt to lenders across active markets, including unfunded withdrawals from expired cycles. Excludes funded withdrawals awaiting collection and protocol fees. Uses indexed market balances and the latest available token prices.",
} as const

export type MetricBasis = keyof typeof METRIC_BASIS
