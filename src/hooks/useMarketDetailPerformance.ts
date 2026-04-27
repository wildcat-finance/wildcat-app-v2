import * as React from "react"

type MarketDetailPerformanceContext = {
  address?: string
  chainId?: number
  role?: "borrower" | "lender"
}

type MarketDetailPerformanceLabel =
  | "row-intent"
  | "route-mount"
  | "api-market-ready"
  | "live-market-ready"
  | "account-ready"
  | "withdrawals-ready"
  | "history-first-row-ready"

const MARKET_DETAIL_PERF_PREFIX = "wildcat:market-detail"

const getContextKey = ({ address, chainId }: MarketDetailPerformanceContext) =>
  [chainId ?? "unknown-chain", address?.toLowerCase() ?? "unknown-market"].join(
    ":",
  )

const isMarketDetailPerformanceEnabled = () => {
  if (typeof window === "undefined" || !window.performance?.mark) {
    return false
  }

  const override = window.localStorage.getItem("wildcat:perf")
  if (override === "1" || override === "true") return true
  if (override === "0" || override === "false") return false

  const { hostname } = window.location
  return (
    process.env.NODE_ENV !== "production" ||
    hostname === "localhost" ||
    hostname.endsWith(".vercel.app")
  )
}

const getMarkName = (
  label: MarketDetailPerformanceLabel,
  context: MarketDetailPerformanceContext,
) => `${MARKET_DETAIL_PERF_PREFIX}:${getContextKey(context)}:${label}`

const measureFromMark = (
  context: MarketDetailPerformanceContext,
  startLabel: MarketDetailPerformanceLabel,
  endLabel: MarketDetailPerformanceLabel,
) => {
  const startMark = getMarkName(startLabel, context)
  const endMark = getMarkName(endLabel, context)
  const measureName = `${MARKET_DETAIL_PERF_PREFIX}:${getContextKey(
    context,
  )}:${startLabel}->${endLabel}`

  try {
    window.performance.measure(measureName, startMark, endMark)
  } catch (_) {
    // A mark can legitimately be missing when the user deep-links directly.
  }
}

export const markMarketDetailPerformance = (
  label: MarketDetailPerformanceLabel,
  context: MarketDetailPerformanceContext,
) => {
  if (!isMarketDetailPerformanceEnabled()) return

  const markName = getMarkName(label, context)
  window.performance.mark(markName)

  if (label === "row-intent") return

  if (label !== "route-mount") {
    measureFromMark(context, "route-mount", label)
  }
  measureFromMark(context, "row-intent", label)
}

export const useMarketDetailPerformanceMark = (
  label: MarketDetailPerformanceLabel,
  context: MarketDetailPerformanceContext,
  ready = true,
) => {
  const contextKey = getContextKey(context)
  const markedKeyRef = React.useRef<string | undefined>(undefined)

  React.useEffect(() => {
    if (!ready) return

    const markKey = `${contextKey}:${label}`
    if (markedKeyRef.current === markKey) return

    markedKeyRef.current = markKey
    markMarketDetailPerformance(label, context)
  }, [context, contextKey, label, ready])
}
