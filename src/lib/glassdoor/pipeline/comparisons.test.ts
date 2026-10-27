/** @jest-environment node */

import {
  borrowerComparisons,
  marketComparisons,
  median,
  protocolCounts,
} from "./comparisons"

const market = (M18: number, M05: number, extra = {}) => ({
  M18,
  M05,
  M24: 50,
  M77: "Open",
  M21: 0,
  M85: 0,
  ...extra,
})

describe("comparisons", () => {
  it("takes the median over graded markets only", () => {
    const markets = [
      market(80, 400),
      market(90, 400),
      market(95, 400),
      market(99, 400),
      market(10, 30),
    ]
    const result = marketComparisons(markets[1], markets)
    expect(result.M18).toEqual({ median: 92.5, population: 4, betterThan: 1 })
  })

  it("ranks lower-is-better metrics the other way and skips ungraded subjects", () => {
    const markets = [
      market(80, 400, { M24: 120 }),
      market(90, 400, { M24: 40 }),
      market(95, 400, { M24: 60 }),
    ]
    expect(marketComparisons(markets[1], markets).M24.betterThan).toBe(2)
    expect(marketComparisons(market(99, 20), markets).M18).toEqual({
      median: 90,
      population: 3,
    })
  })

  it("compares point-in-time metrics across open markets, and not for a closed one", () => {
    const markets = [
      market(80, 400, { M86: 60 }),
      market(90, 400, { M86: 80 }),
      market(95, 400, { M86: 0, M77: "Closed" }),
      market(99, 400, { M86: 0, M77: "Closed" }),
    ]
    expect(marketComparisons(markets[0], markets).M86).toEqual({
      median: 70,
      population: 2,
    })
    expect(marketComparisons(markets[0], markets).M18.population).toBe(4)
    expect(marketComparisons(markets[2], markets).M86).toBeUndefined()
  })

  it("counts the protocol's markets, late markets and completed facilities", () => {
    const markets = [
      market(80, 400, { M21: 1 }),
      market(90, 400, { M85: 1 }),
      market(95, 40, { M77: "Closed", M21: 1 }),
      market(99, 400),
    ]
    const borrowers = [
      { MARKET_DAYS: 800, S30: 2, S05: 90 },
      { MARKET_DAYS: 40, S30: 0, S05: 99 },
    ]
    expect(protocolCounts(markets, borrowers)).toEqual({
      markets: 4,
      openMarkets: 3,
      lateNow: 2,
      gradedMarkets: 3,
      borrowers: 2,
      gradedBorrowers: 1,
      completedFacilities: 2,
    })
    expect(borrowerComparisons(borrowers[0], borrowers).S05).toEqual({
      median: 90,
      population: 1,
      betterThan: 0,
    })
  })

  it("finds the middle of an odd or even population", () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })
})
