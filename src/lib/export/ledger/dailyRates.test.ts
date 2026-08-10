/** @jest-environment node */

import { aggregateAccrualsForDay } from "./dailyRates"
import { percentFromRay, RAY, SECONDS_PER_YEAR } from "../bigint"
import { InterestAccrualRow } from "../types"

const accrual = (
  periodStart: number,
  periodEnd: number,
  annualPercent: number,
): InterestAccrualRow =>
  ({
    periodStart,
    periodEnd,
    baseInterestRay:
      (BigInt(annualPercent) * RAY * BigInt(periodEnd - periodStart)) /
      (100n * SECONDS_PER_YEAR),
    delinquencyFeeRay: 0n,
    protocolFeeBips: 0,
  }) as InterestAccrualRow

describe("daily accrual aggregation", () => {
  it("attributes an accrual period to the UTC day of its event", () => {
    const row = accrual(82_800, 90_000, 18)
    const first = aggregateAccrualsForDay([row], "1970-01-01")
    const second = aggregateAccrualsForDay([row], "1970-01-02")
    expect(first.events).toBe(0)
    expect(second.seconds).toBe(7_200)
    expect(second.baseRay).toBe(row.baseInterestRay)
    expect(percentFromRay(second.baseRay, second.seconds)).toBe("18.000000")
  })

  it("annualises once across a busy day", () => {
    const rows = Array.from({ length: 19 }, (_, index) =>
      accrual(index * 3_600, (index + 1) * 3_600, 16),
    )
    const day = aggregateAccrualsForDay(rows, "1970-01-01")
    expect(day.events).toBe(19)
    expect(percentFromRay(day.baseRay, day.seconds)).toBe("16.000000")
  })
})
