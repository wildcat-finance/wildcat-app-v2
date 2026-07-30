import {
  BatchStatus,
  LenderWithdrawalStatus,
  Market,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"

import { summarizeIncompleteLenderWithdrawals } from "./useGetLenderWithdrawals"
import { sumLenderWithdrawalsExecuted } from "./useLenderMarketAnalytics"

jest.mock("wagmi", () => ({
  useAccount: jest.fn(),
}))

const amount = (raw: bigint): TokenAmount =>
  ({
    raw,
    add: (other: TokenAmount) => amount(raw + other.raw),
  }) as TokenAmount

const withdrawal = ({
  claimable = 0n,
  completed = false,
  concluded,
  requested = 0n,
  unpaid = 0n,
  withdrawn = 0n,
}: {
  claimable?: bigint
  completed?: boolean
  concluded: boolean
  requested?: bigint
  unpaid?: bigint
  withdrawn?: bigint
}): LenderWithdrawalStatus =>
  ({
    availableWithdrawalAmount: amount(claimable),
    effectiveStatus: completed ? BatchStatus.Complete : BatchStatus.Pending,
    isCompleted: completed,
    isConcluded: concluded,
    normalizedAmountWithdrawn: amount(withdrawn),
    normalizedUnpaidAmount: amount(unpaid),
    requests: [{ normalizedAmount: amount(requested) }],
  }) as LenderWithdrawalStatus

describe("lender withdrawal transforms", () => {
  it("keeps only actionable incomplete withdrawals in the market action summary", () => {
    const active = withdrawal({ concluded: false, requested: 12n })
    const expired = withdrawal({
      claimable: 3n,
      concluded: true,
      unpaid: 7n,
    })
    const completed = withdrawal({
      claimable: 20n,
      completed: true,
      concluded: true,
      unpaid: 20n,
    })
    const market = {
      underlyingToken: { getAmount: () => amount(0n) },
    } as unknown as Market

    const result = summarizeIncompleteLenderWithdrawals(market, [
      active,
      expired,
      completed,
    ])

    expect(result.activeWithdrawal).toBe(active)
    expect(result.expiredPendingWithdrawals).toEqual([expired])
    expect(result.activeTotalPendingAmount.raw).toBe(12n)
    expect(result.expiredTotalPendingAmount.raw).toBe(7n)
    expect(result.totalClaimableAmount.raw).toBe(3n)
  })

  it("sums indexed executions without loading completed event history", () => {
    expect(
      sumLenderWithdrawalsExecuted([
        { normalizedAmountWithdrawn: 4n },
        { normalizedAmountWithdrawn: 9n },
      ]),
    ).toBe(13n)
  })
})
