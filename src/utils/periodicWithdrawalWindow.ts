import type { Market } from "@wildcatfi/wildcat-sdk"

import { dayjs } from "@/utils/dayjs"

export const isPeriodicWithdrawalWindowClosed = (market: Market) =>
  !!market.periodicHooksConfig && !market.isPeriodicWithdrawalWindowOpen

export const formatPeriodicWithdrawalWindowStart = (timestamp: number) =>
  dayjs.unix(timestamp).utc().format("D MMM YYYY, HH:mm [UTC]")

export type PeriodicWindowTiming = {
  /** Whether a withdrawal window is open right now. */
  isOpen: boolean
  /** Whether the periodic term has been permanently closed (windows always open). */
  isTermClosed: boolean
  /** Unix seconds at which the current open window closes (only when `isOpen`). */
  currentWindowEnd: number | undefined
  /** Unix seconds at which the next withdrawal window opens. */
  nextWindowStart: number
}

/**
 * Computes the periodic withdrawal-window boundaries purely from the immutable
 * on-chain schedule, mirroring `PeriodicTermHooks` modular arithmetic. Used to
 * drive live countdowns without depending on SDK getter semantics.
 */
export const getPeriodicWindowTiming = (
  market: Market,
  nowSec: number = Date.now() / 1000,
): PeriodicWindowTiming | undefined => {
  const config = market.periodicHooksConfig
  if (!config || !config.periodDuration) return undefined

  const {
    firstWithdrawalWindowStart: start,
    periodDuration: period,
    withdrawalWindowDuration: windowDuration,
  } = config

  if (config.periodicTermClosed) {
    return {
      isOpen: true,
      isTermClosed: true,
      currentWindowEnd: undefined,
      nextWindowStart: start,
    }
  }

  if (nowSec < start) {
    return {
      isOpen: false,
      isTermClosed: false,
      currentWindowEnd: undefined,
      nextWindowStart: start,
    }
  }

  const into = (nowSec - start) % period
  const currentPeriodStart = nowSec - into
  const isOpen = into < windowDuration

  return {
    isOpen,
    isTermClosed: false,
    currentWindowEnd: isOpen ? currentPeriodStart + windowDuration : undefined,
    nextWindowStart: currentPeriodStart + period,
  }
}
