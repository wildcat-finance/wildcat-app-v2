const SECONDS_PER_HOUR = 3_600

export const percentInputToBips = (value: number) =>
  Math.round(Number(value) * 100)

export const hoursInputToSeconds = (value: number) =>
  Math.round(Number(value) * SECONDS_PER_HOUR)

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
