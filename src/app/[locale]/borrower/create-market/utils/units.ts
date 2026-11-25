import humanizeDuration from "humanize-duration"

const SECONDS_PER_HOUR = 3_600

const hoursInputToSeconds = (value: number) =>
  Math.round(Number(value) * SECONDS_PER_HOUR)

const formatDurationFromSeconds = (seconds: number) =>
  Number.isFinite(seconds)
    ? humanizeDuration(seconds * 1000, {
        round: true,
        largest: 4,
        units: ["d", "h", "m", "s"],
      })
    : ""

export const formatDurationFromHoursInput = (hours: number) =>
  Number.isFinite(Number(hours))
    ? formatDurationFromSeconds(hoursInputToSeconds(hours))
    : ""
