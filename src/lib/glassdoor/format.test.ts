/** @jest-environment node */

import { formatHours } from "./format"

const hours = (value: number) => value * 3_600

describe("formatHours", () => {
  it("rounds up to one decimal and drops a trailing .0", () => {
    expect(formatHours(hours(9.5))).toBe("9.5 h")
    expect(formatHours(hours(9.01))).toBe("9.1 h")
    expect(formatHours(hours(9.54))).toBe("9.6 h")
    expect(formatHours(hours(54.6))).toBe("54.6 h")
    expect(formatHours(hours(12))).toBe("12 h")
    expect(formatHours(0)).toBe("0 h")
  })

  it("never rounds to whole hours and separates thousands", () => {
    expect(formatHours(hours(2_588))).toBe("2,588 h")
    expect(formatHours(hours(2_588) + 1)).toBe("2,588.1 h")
  })

  it("uses two decimals for the expanded formula", () => {
    expect(formatHours(34_210, 2)).toBe("9.51 h")
    expect(formatHours(hours(9.5), 2)).toBe("9.5 h")
  })
})
