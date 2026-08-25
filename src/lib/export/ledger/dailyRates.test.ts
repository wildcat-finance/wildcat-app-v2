/** @jest-environment node */

import {
  advanceRateState,
  aggregateAccrualsForDay,
  percentagesFromRateSeconds,
} from "./dailyRates"
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

describe("daily rate accounting", () => {
  it("attributes an accrual period to the UTC day of its event", () => {
    const row = accrual(82_800, 90_000, 18)
    const first = aggregateAccrualsForDay([row], "1970-01-01")
    const second = aggregateAccrualsForDay([row], "1970-01-02")

    expect(first.events).toBe(0)
    expect(second.seconds).toBe(7_200)
    expect(second.baseRay).toBe(row.baseInterestRay)
    expect(percentFromRay(second.baseRay, second.seconds)).toBe("18.000000")
  })

  it("annualises emitted accrual periods once across a busy day", () => {
    const rows = Array.from({ length: 19 }, (_, index) =>
      accrual(index * 3_600, (index + 1) * 3_600, 16),
    )
    const day = aggregateAccrualsForDay(rows, "1970-01-01")
    expect(day.events).toBe(19)
    expect(percentFromRay(day.baseRay, day.seconds)).toBe("16.000000")
  })

  it("keeps charging penalty while a cured delinquency timer unwinds", () => {
    const state = {
      timestamp: 0,
      annualInterestBips: 2_200,
      protocolFeeBips: 500,
      isDelinquent: false,
      timeDelinquent: 90_000,
    }
    const rates = advanceRateState(state, 86_400, 1_200, 3_600)

    expect(percentagesFromRateSeconds(rates, 86_400)).toEqual({
      baseApr: "22.000000",
      penaltyApr: "12.000000",
      protocolFeeApr: "1.100000",
    })
    expect(state.timeDelinquent).toBe(3_600)
  })

  it("does not advance delinquency time when the market has no penalty rate", () => {
    const state = {
      timestamp: 0,
      annualInterestBips: 1_850,
      protocolFeeBips: 500,
      isDelinquent: true,
      timeDelinquent: 0,
    }
    const rates = advanceRateState(state, 86_400, 0, 345_600)

    expect(percentagesFromRateSeconds(rates, 86_400)).toEqual({
      baseApr: "18.500000",
      penaltyApr: "0.000000",
      protocolFeeApr: "0.925000",
    })
    expect(state).toEqual({
      timestamp: 86_400,
      annualInterestBips: 1_850,
      protocolFeeBips: 500,
      isDelinquent: true,
      timeDelinquent: 0,
    })
  })

  it("weights grace-boundary and rate changes by elapsed seconds", () => {
    const state = {
      timestamp: 0,
      annualInterestBips: 1_000,
      protocolFeeBips: 500,
      isDelinquent: true,
      timeDelinquent: 0,
    }
    const first = advanceRateState(state, 3_600, 1_200, 3_600)
    state.annualInterestBips = 2_000
    const second = advanceRateState(state, 7_200, 1_200, 3_600)
    const rates = {
      baseBipsSeconds: 0n,
      penaltyBipsSeconds: 0n,
      protocolBipsSquaredSeconds: 0n,
    }
    rates.baseBipsSeconds = first.baseBipsSeconds + second.baseBipsSeconds
    rates.penaltyBipsSeconds =
      first.penaltyBipsSeconds + second.penaltyBipsSeconds
    rates.protocolBipsSquaredSeconds =
      first.protocolBipsSquaredSeconds + second.protocolBipsSquaredSeconds

    expect(percentagesFromRateSeconds(rates, 7_200)).toEqual({
      baseApr: "15.000000",
      penaltyApr: "6.000000",
      protocolFeeApr: "0.750000",
    })
  })
})
