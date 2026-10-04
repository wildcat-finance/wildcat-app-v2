import type { Market } from "@wildcatfi/wildcat-sdk"
import humanizeDuration from "humanize-duration"

import { dayjs } from "@/utils/dayjs"

export const formatPeriodicWithdrawalWindowStart = (timestamp: number) =>
  dayjs.unix(timestamp).utc().format("D MMM YYYY, HH:mm [UTC]")

const compactDurationHumanizer = humanizeDuration.humanizer({
  language: "compactEn",
  languages: {
    compactEn: {
      y: () => "y",
      mo: () => "mo",
      w: () => "w",
      d: () => "d",
      h: () => "h",
      m: () => "m",
      s: () => "s",
    },
  },
  spacer: "",
  delimiter: " ",
})

/**
 * Compact countdown ("2m 37s", "1h 5m") for width-constrained spots —
 * parameter rows and table chips — where the verbose humanized form
 * truncates. Banners and notices keep the verbose form.
 */
export const formatCompactDuration = (
  seconds: number,
  largest: number = 2,
): string =>
  compactDurationHumanizer(Math.max(0, seconds) * 1000, {
    round: true,
    largest,
  })

/** Immutable recurring-window schedule, as stored by `PeriodicTermHooks`. */
export type PeriodicSchedule = {
  /** Unix seconds anchor of the first withdrawal window (may be in the past). */
  firstWithdrawalWindowStart: number
  /** Seconds between window starts. */
  periodDuration: number
  /** Seconds each window stays open. */
  withdrawalWindowDuration: number
}

export type PeriodicScheduleTiming = {
  /** Whether a withdrawal window is open at `nowSec`. */
  isOpen: boolean
  /** Unix seconds at which the current open window closes (only when `isOpen`). */
  currentWindowEnd: number | undefined
  /** Unix seconds at which the next withdrawal window opens. */
  nextWindowStart: number
}

export type PeriodicWindowTiming = PeriodicScheduleTiming & {
  /** Whether window restrictions have ended through closure or scheduled repayment. */
  isTermClosed: boolean
}

/**
 * Pure schedule arithmetic mirroring `PeriodicTermHooks` modular math. Takes
 * the raw schedule so leaf components (e.g. table chips) can recompute live
 * timing without holding a `Market` instance.
 */
export const getPeriodicScheduleTiming = (
  schedule: PeriodicSchedule,
  nowSec: number,
): PeriodicScheduleTiming => {
  const {
    firstWithdrawalWindowStart: start,
    periodDuration: period,
    withdrawalWindowDuration: windowDuration,
  } = schedule

  if (nowSec < start) {
    return {
      isOpen: false,
      currentWindowEnd: undefined,
      nextWindowStart: start,
    }
  }

  const into = (nowSec - start) % period
  const currentPeriodStart = nowSec - into
  const isOpen = into < windowDuration

  return {
    isOpen,
    currentWindowEnd: isOpen ? currentPeriodStart + windowDuration : undefined,
    nextWindowStart: currentPeriodStart + period,
  }
}

/**
 * Computes the periodic withdrawal-window boundaries purely from the immutable
 * on-chain schedule. Used to drive live countdowns without depending on SDK
 * getter semantics.
 */
export const getPeriodicWindowTiming = (
  market: Market,
  nowSec: number = Date.now() / 1000,
): PeriodicWindowTiming | undefined => {
  const config = market.periodicHooksConfig
  if (!config || !config.periodDuration) return undefined

  if (config.periodicTermClosed || market.hasReachedRepaymentDate) {
    return {
      isOpen: true,
      isTermClosed: true,
      currentWindowEnd: undefined,
      nextWindowStart: config.firstWithdrawalWindowStart,
    }
  }

  return { ...getPeriodicScheduleTiming(config, nowSec), isTermClosed: false }
}

/**
 * Whether queueing a withdrawal is currently blocked by the recurring window.
 * A closed market, closed periodic term or observed repayment date never blocks.
 */
export const isPeriodicWithdrawalWindowClosed = (
  market: Market,
  nowSec: number = Date.now() / 1000,
) => {
  if (market.isClosed || market.hasReachedRepaymentDate) return false
  const timing = getPeriodicWindowTiming(market, nowSec)
  return !!timing && !timing.isOpen
}
