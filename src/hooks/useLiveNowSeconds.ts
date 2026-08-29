import { useEffect, useState } from "react"

const DEFAULT_TICK_MS = 1_000

/**
 * Current unix time in seconds, re-rendering the consumer on an interval while
 * `enabled`. Drives live countdowns and open/closed flips for periodic-term
 * withdrawal windows, whose boundaries pass in real time without any data
 * refetch.
 *
 * While disabled it behaves like a plain `Date.now()` read, so values stay
 * fresh across externally-triggered renders without running a timer.
 */
export const useLiveNowSeconds = (
  enabled: boolean,
  intervalMs: number = DEFAULT_TICK_MS,
): number => {
  const [tickNowSec, setTickNowSec] = useState(() => Date.now() / 1000)

  useEffect(() => {
    if (!enabled) return undefined
    setTickNowSec(Date.now() / 1000)
    const id = setInterval(() => setTickNowSec(Date.now() / 1000), intervalMs)
    return () => clearInterval(id)
  }, [enabled, intervalMs])

  return enabled ? tickNowSec : Date.now() / 1000
}

type PeriodicClockMarket = {
  isClosed: boolean
  periodicHooksConfig?: {
    periodDuration: number
    periodicTermClosed: boolean
  }
}

export const hasLivePeriodicClock = (market: PeriodicClockMarket): boolean =>
  !!market.periodicHooksConfig?.periodDuration &&
  !market.periodicHooksConfig.periodicTermClosed &&
  !market.isClosed

/**
 * `useLiveNowSeconds` pre-wired for a periodic-term market: ticks only while
 * the market has an active recurring schedule (periodic, not term-closed, not
 * market-closed).
 */
export const useLivePeriodicNowSeconds = (
  market: PeriodicClockMarket,
): number => useLiveNowSeconds(hasLivePeriodicClock(market))
