import humanizeDuration from "humanize-duration"

const SECONDS_PER_HOUR = 3_600

export const hoursInputToSeconds = (value: number) =>
  Math.round(Number(value) * SECONDS_PER_HOUR)

/**
 * One presentation for every duration the flow displays: normalised to
 * seconds and then humanised. Keep every day/hour/minute/second component:
 * this is the final parameter review, and dropping the smaller components can
 * make a value such as 1.99 days look like exactly 2 days.
 */
export const formatDurationFromSeconds = (seconds: number) =>
  Number.isFinite(seconds)
    ? humanizeDuration(seconds * 1000, {
        round: true,
        largest: 4,
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
