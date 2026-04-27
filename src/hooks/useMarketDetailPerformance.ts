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
const WILDCAT_PERF_HELPER_KEY = "__wildcatPerf"

type WildcatMarketDetailMeasure = {
  name: string
  market: string
  chainId: string
  measure: string
  durationMs: number
  startMs: number
}

declare global {
  interface Window {
    __wildcatPerf?: () => WildcatMarketDetailMeasure[]
  }
}

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

const getMarketDetailPerformanceMeasures = (): WildcatMarketDetailMeasure[] =>
  window.performance
    .getEntriesByType("measure")
    .filter((entry) => entry.name.startsWith(MARKET_DETAIL_PERF_PREFIX))
    .map((entry) => {
      const [, , chainId, market, measure] = entry.name.split(":")
      return {
        name: entry.name,
        market,
        chainId,
        measure,
        durationMs: Math.round(entry.duration),
        startMs: Math.round(entry.startTime),
      }
    })

const installWildcatPerfHelper = () => {
  if (!isMarketDetailPerformanceEnabled() || window[WILDCAT_PERF_HELPER_KEY]) {
    return
  }

  window[WILDCAT_PERF_HELPER_KEY] = () => {
    const measures = getMarketDetailPerformanceMeasures()
    // Helper is invoked manually from DevTools when collecting preview metrics.
    // eslint-disable-next-line no-console
    console.table(measures)
    return measures
  }
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
  installWildcatPerfHelper()

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
