import humanizeDuration from "humanize-duration"

const SECONDS_PER_HOUR = 3_600

export const percentInputToBips = (value: number) =>
  Math.round(Number(value) * 100)

export const hoursInputToSeconds = (value: number) =>
  Math.round(Number(value) * SECONDS_PER_HOUR)

/**
 * One presentation for every duration the flow displays. The inputs are
 * denominated differently — grace period and withdrawal cycle in hours, the
 * periodic durations in whichever unit the Days/Hours/Minutes toggle is on —
 * so everything is normalised to seconds and then humanised, which picks the
 * unit from the magnitude instead of from the input. Same compound form the
 * market parameters page uses, so a market reads identically before and after
 * deployment.
 */
export const formatDurationFromSeconds = (seconds: number) =>
  Number.isFinite(seconds)
    ? humanizeDuration(seconds * 1000, {
        round: true,
        largest: 2,
        // Weeks and months are not units this flow ever asks for, and they
        // read as approximations: the 90-day grace-period ceiling humanises to
        // "2 months, 4 weeks" by default.
        units: ["d", "h", "m", "s"],
      })
    : ""

export const formatDurationFromHoursInput = (hours: number) =>
  Number.isFinite(Number(hours))
    ? formatDurationFromSeconds(hoursInputToSeconds(hours))
    : ""

/**
 * Display units for the periodic-term duration inputs. The form always stores
 * seconds; the unit only scales what the user types. Minutes exist so the
 * contract minimums (6-minute period, 1-minute window) are exactly enterable
 * for short-cycle testnet markets.
 */
export const PERIODIC_DURATION_UNITS = ["Days", "Hours", "Minutes"] as const

export type PeriodicDurationUnit = (typeof PERIODIC_DURATION_UNITS)[number]

export const PERIODIC_DURATION_UNIT_SECONDS: Record<
  PeriodicDurationUnit,
  number
> = {
  Days: 86_400,
  Hours: 3_600,
  Minutes: 60,
}
