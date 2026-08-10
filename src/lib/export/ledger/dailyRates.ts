import { BIPS } from "../bigint"
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
