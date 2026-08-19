import { HooksKind, Market, MarketVersion } from "@wildcatfi/wildcat-sdk"

import { getMarketTypeChip } from "@/utils/marketType"

const makeMarket = (overrides: Partial<Market> = {}) =>
  ({
    version: MarketVersion.V2,
    ...overrides,
  }) as Market

describe("getMarketTypeChip", () => {
  it("labels V1 markets as open term", () => {
    const market = makeMarket({
      version: MarketVersion.V1,
      hooksKind: HooksKind.FixedTerm,
    })

    expect(getMarketTypeChip(market)).toEqual({ kind: HooksKind.OpenTerm })
  })

  it("includes the remaining duration for fixed-term markets", () => {
    jest.spyOn(Date, "now").mockReturnValue(1_000_000)
    const market = makeMarket({
      hooksConfig: {
        kind: HooksKind.FixedTerm,
        fixedTermEndTime: 2_000,
      } as Market["hooksConfig"],
    })

    expect(getMarketTypeChip(market)).toEqual({
      kind: HooksKind.FixedTerm,
      fixedPeriod: 1_000_000,
      fixedTermEndTime: 2_000,
    })

    jest.restoreAllMocks()
  })

  it("passes the periodic schedule through for a live countdown", () => {
    const market = makeMarket({
      hooksKind: HooksKind.PeriodicTerm,
      periodicHooksConfig: {
        kind: HooksKind.PeriodicTerm,
        firstWithdrawalWindowStart: 1_000,
        periodDuration: 100,
        withdrawalWindowDuration: 20,
        periodicTermClosed: false,
      } as Market["periodicHooksConfig"],
    })

    expect(getMarketTypeChip(market)).toEqual({
      kind: HooksKind.PeriodicTerm,
      periodicWindow: {
        isTermClosed: false,
        firstWithdrawalWindowStart: 1_000,
        periodDuration: 100,
        withdrawalWindowDuration: 20,
      },
    })
  })

  it("falls back to the market hook kind", () => {
    const market = makeMarket({ hooksKind: HooksKind.OpenTerm })

    expect(getMarketTypeChip(market)).toEqual({ kind: HooksKind.OpenTerm })
  })
})
