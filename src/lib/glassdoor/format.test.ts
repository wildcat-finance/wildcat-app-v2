/** @jest-environment node */

import { roundedHours } from "./format"

const hours = (value: number) => value * 3_600

describe("roundedHours", () => {
  it("rounds up to one decimal and drops a trailing .0", () => {
    expect(roundedHours(hours(9.5))).toBe("9.5")
    expect(roundedHours(hours(9.01))).toBe("9.1")
    expect(roundedHours(hours(9.54))).toBe("9.6")
    expect(roundedHours(hours(54.6))).toBe("54.6")
    expect(roundedHours(hours(12))).toBe("12")
    expect(roundedHours(0)).toBe("0")
  })

  it("never rounds to whole hours and separates thousands", () => {
    expect(roundedHours(hours(2_588))).toBe("2,588")
    expect(roundedHours(hours(2_588) + 1)).toBe("2,588.1")
  })

  it("uses two decimals for the expanded formula", () => {
    expect(roundedHours(34_210, 2)).toBe("9.51")
    expect(roundedHours(hours(9.5), 2)).toBe("9.5")
  })
})
