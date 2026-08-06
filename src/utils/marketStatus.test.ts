import { Market } from "@wildcatfi/wildcat-sdk"

import {
  TOU_DEFAULT_THRESHOLD_SECONDS,
  countMarketsInTouDefault,
  isMarketInTouDefault,
} from "./marketStatus"

const DAY = 24 * 60 * 60
const GRACE = 2 * DAY

const market = (
  timeDelinquent: number,
  delinquencyGracePeriod = GRACE,
  isClosed = false,
) => ({ timeDelinquent, delinquencyGracePeriod, isClosed }) as Market

describe("isMarketInTouDefault", () => {
  it("is false inside the grace period", () => {
    expect(isMarketInTouDefault(market(DAY))).toBe(false)
  })

  it("is false at eighty-nine days past grace", () => {
    expect(isMarketInTouDefault(market(GRACE + 89 * DAY))).toBe(false)
  })

  it("is true at exactly ninety days past grace", () => {
    expect(
      isMarketInTouDefault(market(GRACE + TOU_DEFAULT_THRESHOLD_SECONDS)),
    ).toBe(true)
  })

  it("measures from the market's own grace period", () => {
    const grace = 10 * DAY
    expect(isMarketInTouDefault(market(grace + 89 * DAY, grace))).toBe(false)
    expect(isMarketInTouDefault(market(grace + 90 * DAY, grace))).toBe(true)
  })

  it("is false once the market is closed", () => {
    expect(
      isMarketInTouDefault(
        market(GRACE + TOU_DEFAULT_THRESHOLD_SECONDS, GRACE, true),
      ),
    ).toBe(false)
  })
})

describe("countMarketsInTouDefault", () => {
  it("returns undefined while markets are unloaded", () => {
    expect(countMarketsInTouDefault(undefined)).toBeUndefined()
  })

  it("returns zero for a borrower with no markets", () => {
    expect(countMarketsInTouDefault([])).toBe(0)
  })

  it("counts only markets past the threshold", () => {
    expect(
      countMarketsInTouDefault([
        market(DAY),
        market(GRACE + 90 * DAY),
        market(GRACE + 200 * DAY),
      ]),
    ).toBe(2)
  })
})
