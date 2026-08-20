import {
  PENALTY_DEFAULT_THRESHOLD_SECONDS,
  countMarketsInDefault,
  isMarketInDefault,
} from "./marketStatus"

const DAY = 24 * 60 * 60
const GRACE = 2 * DAY

const market = (
  timeDelinquent: number,
  delinquencyGracePeriod = GRACE,
  isClosed = false,
) => ({
  timeDelinquent,
  delinquencyGracePeriod,
  isClosed,
})

describe("isMarketInDefault", () => {
  it("is false inside the grace period", () => {
    expect(isMarketInDefault(market(DAY))).toBe(false)
  })

  it("is false at eighty-nine days past grace", () => {
    expect(isMarketInDefault(market(GRACE + 89 * DAY))).toBe(false)
  })

  it("is true at exactly ninety days past grace", () => {
    expect(
      isMarketInDefault(market(GRACE + PENALTY_DEFAULT_THRESHOLD_SECONDS)),
    ).toBe(true)
  })

  it("measures from the market's own grace period", () => {
    const grace = 10 * DAY
    expect(isMarketInDefault(market(grace + 89 * DAY, grace))).toBe(false)
    expect(isMarketInDefault(market(grace + 90 * DAY, grace))).toBe(true)
  })

  it("does not require an unhonoured withdrawal request", () => {
    const marketWithoutRequests = {
      ...market(GRACE + PENALTY_DEFAULT_THRESHOLD_SECONDS),
      unpaidWithdrawalBatchExpiries: [],
    }

    expect(isMarketInDefault(marketWithoutRequests)).toBe(true)
  })

  it("is false once the market is closed", () => {
    expect(
      isMarketInDefault(
        market(GRACE + PENALTY_DEFAULT_THRESHOLD_SECONDS, GRACE, true),
      ),
    ).toBe(false)
  })
})

describe("countMarketsInDefault", () => {
  it("returns undefined while markets are unloaded", () => {
    expect(countMarketsInDefault(undefined)).toBeUndefined()
  })

  it("returns zero for a borrower with no markets", () => {
    expect(countMarketsInDefault([])).toBe(0)
  })

  it("does not count a market that has only just tipped delinquent", () => {
    expect(countMarketsInDefault([market(0)])).toBe(0)
  })

  it("counts only markets past the threshold", () => {
    expect(
      countMarketsInDefault([
        market(DAY),
        market(GRACE + 90 * DAY),
        market(GRACE + 200 * DAY),
      ]),
    ).toBe(2)
  })
})
