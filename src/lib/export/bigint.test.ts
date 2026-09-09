/** @jest-environment node */

import {
  formatUnits,
  addPercentages,
  multiplyPercentByBips,
  percentFromRay,
  percentFromScaleFactors,
  RAY,
  rayDiv,
  rayMul,
  SECONDS_PER_YEAR,
} from "./bigint"

describe("export bigint helpers", () => {
  it("uses protocol-compatible half-up ray arithmetic", () => {
    expect(rayMul(3n * RAY, RAY / 2n)).toBe(
      1_500_000_000_000_000_000_000_000_000n,
    )
    expect(rayDiv(RAY, 2n * RAY)).toBe(RAY / 2n)
  })

  it("formats signed token values without floating point", () => {
    expect(formatUnits(-1_234_500n, 6)).toBe("-1.2345")
    expect(formatUnits(12n, 0)).toBe("12")
  })

  it("annualises a ray increment once and rounds to six decimals", () => {
    const eighteenPercentRay = (RAY * 18n) / 100n
    expect(percentFromRay(eighteenPercentRay, Number(SECONDS_PER_YEAR))).toBe(
      "18.000000",
    )

    const seconds = 86_400n
    const penaltyRay =
      (14_767_940n * RAY * seconds) / (1_000_000n * 100n * SECONDS_PER_YEAR)
    expect(percentFromRay(penaltyRay, Number(seconds))).toBe("14.767940")
  })

  it("combines and applies percentages without floating point", () => {
    expect(addPercentages("18.000000", "14.767940")).toBe("32.767940")
    expect(multiplyPercentByBips("18.000000", 500)).toBe("0.900000")
    expect(
      percentFromScaleFactors(RAY, RAY + RAY / 100n, Number(SECONDS_PER_YEAR)),
    ).toBe("1.000000")
  })
})
