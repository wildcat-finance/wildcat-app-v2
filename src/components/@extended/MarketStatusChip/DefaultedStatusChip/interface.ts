export type DefaultedStatusChipProps = {
  // Days the penalty rate has been running; the caption hides below one day,
  // e.g. for cured markets or closed ones (closing resets the timer)
  penaltyDays: number
  variant?: "filled" | "text"
  withPeriod?: boolean
  // "stacked" puts the penalty caption under the chip (tables),
  // "inline" to its right (market header)
  periodLayout?: "stacked" | "inline"
}
