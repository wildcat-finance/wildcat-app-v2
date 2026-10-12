import type { Market } from "@wildcatfi/wildcat-sdk"

import { getPeriodicWindowTiming } from "@/utils/periodicWithdrawalWindow"

/** Display timing follows the same window boundaries as withdrawal eligibility. */
export const getWithdrawalCyclePhase = (market: Market, now: number) => {
  const config = market.periodicHooksConfig
  const timing = getPeriodicWindowTiming(market, now)
  if (!config || !timing) return undefined
  if (market.isClosed) return { kind: "ended" as const }
  if (timing.isTermClosed) return { kind: "unrestricted" as const }
  if (now < config.firstWithdrawalWindowStart) {
    return {
      kind: "upcoming" as const,
      remaining: Math.ceil(config.firstWithdrawalWindowStart - now),
    }
  }

  const duration = timing.isOpen
    ? config.withdrawalWindowDuration
    : config.periodDuration - config.withdrawalWindowDuration
  const end = timing.currentWindowEnd ?? timing.nextWindowStart
  const elapsed = duration - (end - now)
  return {
    kind: timing.isOpen ? ("open" as const) : ("closed" as const),
    duration,
    elapsed: Math.floor(elapsed),
    remaining: Math.ceil(end - now),
    progress: elapsed / duration,
  }
}
