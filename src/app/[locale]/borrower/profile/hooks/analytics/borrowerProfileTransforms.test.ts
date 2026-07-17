import {
  BorrowerAggregateDebtRaw,
  BorrowerWithdrawalBatchRaw,
  buildBorrowerAggregateDebtData,
  buildBorrowerWithdrawalAnalytics,
} from "./borrowerProfileTransforms"

const RAY = "1000000000000000000000000000"

const debtPoint = (usdPrice: string | null): BorrowerAggregateDebtRaw => ({
  startTimestamp: 1_700_000_000,
  scaledTotalSupply: "1000000",
  scaleFactor: RAY,
  usdPrice,
  market: {
    id: "0xmarket",
    asset: { decimals: 6 },
  },
})

const pendingBatch: BorrowerWithdrawalBatchRaw = {
  id: "batch-1",
  expiry: "2000",
  isExpired: false,
  isClosed: false,
  totalNormalizedRequests: "1000000",
  market: {
    id: "0xmarket",
    name: "Test Market",
    asset: { decimals: 6 },
  },
  expiration: null,
}

describe("borrower profile analytics transforms", () => {
  it("uses the indexed historical price when one is available", () => {
    const result = buildBorrowerAggregateDebtData({
      marketDailyStats: [debtPoint("2")],
      priceMap: {},
      nameMap: { "0xmarket": "Test Market" },
    })

    expect(result.points[0].totalDebtUsd).toBe(2)
  })

  it("uses the current indexed price only as a historical fallback", () => {
    const result = buildBorrowerAggregateDebtData({
      marketDailyStats: [debtPoint(null)],
      priceMap: { "0xmarket": 3 },
      nameMap: { "0xmarket": "Test Market" },
    })

    expect(result.points[0].totalDebtUsd).toBe(3)
  })

  it("does not convert a missing market price into zero debt", () => {
    expect(() =>
      buildBorrowerAggregateDebtData({
        marketDailyStats: [debtPoint(null)],
        priceMap: {},
        nameMap: {},
      }),
    ).toThrow("Missing USD price for market 0xmarket")
  })

  it("prices pending withdrawal batches without a zero fallback", () => {
    const result = buildBorrowerWithdrawalAnalytics({
      withdrawalBatches: [pendingBatch],
      priceMap: { "0xmarket": 2 },
      nowSec: 1000,
    })

    expect(result.pendingBatches).toBe(1)
    expect(result.totalQueued).toBe(2)
  })

  it("rejects an unpriced withdrawal batch", () => {
    expect(() =>
      buildBorrowerWithdrawalAnalytics({
        withdrawalBatches: [pendingBatch],
        priceMap: {},
        nowSec: 1000,
      }),
    ).toThrow("Missing USD price for market 0xmarket")
  })
})
