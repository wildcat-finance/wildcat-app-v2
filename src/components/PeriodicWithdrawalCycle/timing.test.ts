import type { Market } from "@wildcatfi/wildcat-sdk"

import { getWithdrawalCyclePhase } from "./timing"

const start = 1_800_000_000
const makeMarket = () =>
  ({
    isClosed: false,
    hasReachedRepaymentDate: false,
    periodicHooksConfig: {
      firstWithdrawalWindowStart: start,
      periodDuration: 1800,
      withdrawalWindowDuration: 600,
      periodicTermClosed: false,
    },
  }) as Market

describe("withdrawal cycle phase", () => {
  it.each([
    [0, "open", 600, 0],
    [599, "open", 1, 599],
    [600, "closed", 1200, 0],
    [1799, "closed", 1, 1199],
    [1800, "open", 600, 0],
    [4200, "closed", 1200, 0],
  ])("handles the boundary at +%is", (offset, kind, remaining, elapsed) => {
    expect(getWithdrawalCyclePhase(makeMarket(), start + offset)).toMatchObject(
      {
        kind,
        remaining,
        elapsed,
      },
    )
  })

  it("waits for the first opening without inventing elapsed locked time", () => {
    expect(getWithdrawalCyclePhase(makeMarket(), start - 10)).toEqual({
      kind: "upcoming",
      remaining: 10,
    })
  })

  it("moves through each phase independently of its duration", () => {
    expect(getWithdrawalCyclePhase(makeMarket(), start + 300)).toMatchObject({
      kind: "open",
      progress: 0.5,
    })
    expect(getWithdrawalCyclePhase(makeMarket(), start + 1200)).toMatchObject({
      kind: "closed",
      progress: 0.5,
    })
  })

  it("does not show closed windows after the term ends or repayment is observed", () => {
    const market = makeMarket()
    market.periodicHooksConfig!.periodicTermClosed = true
    expect(getWithdrawalCyclePhase(market, start + 900)).toEqual({
      kind: "unrestricted",
    })
    const repayingMarket = {
      ...makeMarket(),
      hasReachedRepaymentDate: true,
    } as Market
    expect(getWithdrawalCyclePhase(repayingMarket, start + 900)).toEqual({
      kind: "unrestricted",
    })
  })

  it("stops the cycle when the market is closed", () => {
    const market = makeMarket()
    market.isClosed = true
    expect(getWithdrawalCyclePhase(market, start + 900)).toEqual({
      kind: "ended",
    })
  })

  it("does not render a cycle for non-periodic markets", () => {
    expect(
      getWithdrawalCyclePhase({ isClosed: false } as Market, start),
    ).toBeUndefined()
  })
})
