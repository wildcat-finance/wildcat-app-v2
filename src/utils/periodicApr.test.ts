import { Market } from "@wildcatfi/wildcat-sdk"

import { getPendingPeriodicAprChange } from "./periodicApr"

const marketWithPendingReduction = {
  annualInterestBips: 1_000,
  periodicHooksConfig: {
    pendingAprChangeAnnualInterestBips: 900,
    pendingAprChangeProposalTimestamp: 900,
    pendingAprChangeResponseWindowStart: 1_000,
    pendingAprChangeResponseWindowEnd: 1_100,
    periodDuration: 500,
  },
} as Market

describe("getPendingPeriodicAprChange", () => {
  it("expires from the response-window start, matching the hook contract", () => {
    const beforeExpiry = getPendingPeriodicAprChange(
      marketWithPendingReduction,
      1_499,
    )
    const atExpiry = getPendingPeriodicAprChange(
      marketWithPendingReduction,
      1_500,
    )

    expect(beforeExpiry).toMatchObject({
      expiresAt: 1_500,
      isExpired: false,
    })
    expect(atExpiry).toMatchObject({
      expiresAt: 1_500,
      isExpired: true,
    })
  })
})
