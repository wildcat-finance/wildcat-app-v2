const SECONDS_PER_HOUR = 3_600

export const percentInputToBips = (value: number) =>
  Math.round(Number(value) * 100)

export const hoursInputToSeconds = (value: number) =>
  Math.round(Number(value) * SECONDS_PER_HOUR)
