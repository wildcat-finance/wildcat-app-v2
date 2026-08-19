import { formatNumberWithCommas } from "./formatters"

describe("formatNumberWithCommas", () => {
  it("groups thousands", () => {
    expect(formatNumberWithCommas(1_000_000)).toBe("1,000,000")
  })

  it("respects the requested decimal precision", () => {
    expect(formatNumberWithCommas(1_234.5678, 2)).toBe("1,234.57")
    expect(formatNumberWithCommas(1_234.5678, 4)).toBe("1,234.5678")
  })

  it("renders an absent optional value as zero", () => {
    expect(formatNumberWithCommas(undefined)).toBe("0")
  })
})
