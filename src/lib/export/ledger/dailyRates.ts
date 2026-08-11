import { BIPS, formatFixed } from "../bigint"
import { InterestAccrualRow } from "../types"

const utcDate = (timestamp: number) =>
  new Date(timestamp * 1_000).toISOString().slice(0, 10)

export function aggregateAccrualsForDay(
  accruals: InterestAccrualRow[],
  day: string,
) {
  return accruals
    .filter((accrual) => utcDate(accrual.periodEnd) === day)
    .reduce(
      (totals, accrual) => ({
        baseRay: totals.baseRay + accrual.baseInterestRay,
        penaltyRay: totals.penaltyRay + accrual.delinquencyFeeRay,
        protocolRay:
          totals.protocolRay +
          (accrual.baseInterestRay * BigInt(accrual.protocolFeeBips) +
            BIPS / 2n) /
            BIPS,
        seconds: totals.seconds + accrual.periodEnd - accrual.periodStart,
        events: totals.events + 1,
      }),
      {
        baseRay: 0n,
        penaltyRay: 0n,
        protocolRay: 0n,
        seconds: 0,
        events: 0,
      },
    )
}

export type RateState = {
  timestamp: number
  annualInterestBips: number
  protocolFeeBips: number
  isDelinquent: boolean
  timeDelinquent: number
}

export type RateSeconds = {
  baseBipsSeconds: bigint
  penaltyBipsSeconds: bigint
  protocolBipsSquaredSeconds: bigint
}

// Mirrors FeeMath.updateTimeDelinquentAndGetPenaltyTime in v2-protocol.
export function advanceRateState(
  state: RateState,
  timestamp: number,
  delinquencyFeeBips: number,
  gracePeriod: number,
): RateSeconds {
  const elapsed = Math.max(0, timestamp - state.timestamp)
  const previousTimeDelinquent = state.timeDelinquent
  let penaltySeconds: number
  if (state.isDelinquent) {
    state.timeDelinquent = previousTimeDelinquent + elapsed
    penaltySeconds = Math.max(
      0,
      elapsed - Math.max(0, gracePeriod - previousTimeDelinquent),
    )
  } else {
    state.timeDelinquent = Math.max(0, previousTimeDelinquent - elapsed)
    penaltySeconds = Math.min(
      elapsed,
      Math.max(0, previousTimeDelinquent - gracePeriod),
    )
  }
  state.timestamp = timestamp
  return {
    baseBipsSeconds: BigInt(state.annualInterestBips) * BigInt(elapsed),
    penaltyBipsSeconds: BigInt(delinquencyFeeBips) * BigInt(penaltySeconds),
    protocolBipsSquaredSeconds:
      BigInt(state.annualInterestBips) *
      BigInt(state.protocolFeeBips) *
      BigInt(elapsed),
  }
}

export function percentagesFromRateSeconds(
  values: RateSeconds,
  elapsed: number,
) {
  if (elapsed <= 0) {
    return {
      baseApr: "0.000000",
      penaltyApr: "0.000000",
      protocolFeeApr: "0.000000",
    }
  }
  const seconds = BigInt(elapsed)
  const rounded = (numerator: bigint, denominator: bigint) =>
    (numerator + denominator / 2n) / denominator
  return {
    baseApr: formatFixed(rounded(values.baseBipsSeconds * 10_000n, seconds), 6),
    penaltyApr: formatFixed(
      rounded(values.penaltyBipsSeconds * 10_000n, seconds),
      6,
    ),
    protocolFeeApr: formatFixed(
      rounded(values.protocolBipsSquaredSeconds, seconds),
      6,
    ),
  }
}
