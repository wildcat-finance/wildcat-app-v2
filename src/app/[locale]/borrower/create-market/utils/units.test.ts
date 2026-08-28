import {
  formatDurationFromHoursInput,
  formatDurationFromSeconds,
} from "./units"

describe("create-market duration display", () => {
  it("preserves every on-chain duration component", () => {
    expect(formatDurationFromSeconds(Math.round(1.99 * 86_400))).toBe(
      "1 day, 23 hours, 45 minutes, 36 seconds",
    )
    expect(formatDurationFromHoursInput(23.99)).toBe(
      "23 hours, 59 minutes, 24 seconds",
    )
  })

  it("keeps exact short durations concise", () => {
    expect(formatDurationFromHoursInput(0.1)).toBe("6 minutes")
    expect(formatDurationFromSeconds(60)).toBe("1 minute")
  })

  it("does not invent a duration for invalid input", () => {
    expect(formatDurationFromSeconds(Number.NaN)).toBe("")
    expect(formatDurationFromHoursInput(Number.NaN)).toBe("")
  })
})
