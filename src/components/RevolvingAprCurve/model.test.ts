import { Market, MarketVersion } from "@wildcatfi/wildcat-sdk"

import { getRevolvingAprCurve } from "./model"

const makeMarket = (
  utilizationBips = 6500,
  configuredAprBips = 1000,
  penaltyAprBips = 0,
) =>
  ({
    version: MarketVersion.V2,
    marketKind: "revolving",
    isClosed: false,
    isIncurringPenalties: penaltyAprBips > 0,
    delinquencyFeeBips: penaltyAprBips,
    currentAprDisplayBips: {
      isRevolving: true,
      configuredAprKind: "utilization",
      configuredAprBips,
      commitmentAprBips: 200,
      utilizationBips,
      currentProtocolAprBips: 100,
      currentEffectiveLenderAprBips:
        200 +
        Math.floor((utilizationBips * configuredAprBips) / 10_000) +
        penaltyAprBips,
    },
  }) as unknown as Market

describe("RCF APR curve", () => {
  it.each([
    [0, 200],
    [6500, 850],
    [10_000, 1200],
  ])("matches the lender rate at %i bps utilization", (utilization, rate) => {
    expect(getRevolvingAprCurve(makeMarket(utilization))).toEqual({
      minimumAprBips: 200,
      maximumAprBips: 1200,
      currentAprBips: rate,
      utilizationBips: utilization,
      penaltyAprBips: 0,
    })
  })

  it("shifts the whole curve for active penalties without subtracting protocol fees", () => {
    expect(getRevolvingAprCurve(makeMarket(6500, 1000, 300))).toMatchObject({
      minimumAprBips: 500,
      maximumAprBips: 1500,
      currentAprBips: 1150,
      penaltyAprBips: 300,
    })
  })

  it("allows a flat rate when utilization APR is zero", () => {
    expect(getRevolvingAprCurve(makeMarket(6500, 0))).toMatchObject({
      minimumAprBips: 200,
      maximumAprBips: 200,
      currentAprBips: 200,
    })
  })

  it("uses the SDK's current rate rather than recalculating it from rounded utilization", () => {
    const market = makeMarket()
    Object.assign(market.currentAprDisplayBips!, {
      currentEffectiveLenderAprBips: 851,
    })
    expect(getRevolvingAprCurve(market)?.currentAprBips).toBe(851)
  })

  it("does not invent a zero rate when metrics are unavailable", () => {
    const market = makeMarket()
    Object.assign(market.currentAprDisplayBips!, {
      commitmentAprBips: undefined,
    })
    expect(getRevolvingAprCurve(market)).toBeUndefined()
  })

  it("does not show an active rate curve for a closed market", () => {
    const market = makeMarket()
    market.isClosed = true
    expect(getRevolvingAprCurve(market)).toBeUndefined()
  })

  it("does not draw an RCF curve for a standard market", () => {
    const market = makeMarket()
    market.marketKind = "standard"
    Object.assign(market.currentAprDisplayBips!, {
      isRevolving: false,
      configuredAprKind: "annualInterest",
    })
    expect(getRevolvingAprCurve(market)).toBeUndefined()
  })
})
