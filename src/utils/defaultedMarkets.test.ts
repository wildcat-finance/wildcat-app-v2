import { getMarketDefaultStatus } from "@wildcatfi/wildcat-sdk"

import {
  fetchDefaultedMarkets,
  isDefaultedMarketsData,
} from "./defaultedMarkets"

const mockQuery = jest.fn()
jest.mock("@wildcatfi/wildcat-sdk", () => ({
  DEFAULT_DELINQUENCY_PERIOD: 90 * 24 * 60 * 60,
  getSubgraphClient: () => ({ query: mockQuery }),
  getMarketDefaultStatus: jest.fn(),
}))
jest.mock("@wildcatfi/wildcat-sdk/dist/internal/legacy-default", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk/dist/internal/legacy-default"),
  reconstructLegacyDefault: () => null,
}))

const address = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const borrower = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
const history = {
  id: address,
  borrower,
  delinquencyStatusChangedIndex: 1,
  delinquencyRecords: [],
  lastInterestAccruedTimestamp: 100,
}
const page = (markets: (typeof history)[], timestamp = 1000) => ({
  data: {
    markets,
    _meta: {
      deployment: "deployment",
      hasIndexingErrors: false,
      block: { number: 100, timestamp },
    },
  },
})

beforeEach(() => {
  mockQuery.mockReset()
  jest.mocked(getMarketDefaultStatus).mockReset()
})

it("uses the oldest bulk-page timestamp, including an empty final page", async () => {
  const shortHistory = { ...history, delinquencyStatusChangedIndex: 0 }
  mockQuery
    .mockResolvedValueOnce(page(Array(200).fill(shortHistory)))
    .mockResolvedValueOnce(page([], 900))
  expect(await fetchDefaultedMarkets(1)).toEqual({
    markets: {},
    unknown: [],
    asOfTimestamp: 900,
  })
})

it("cannot establish freshness when the final empty page lacks valid metadata", async () => {
  mockQuery
    .mockResolvedValueOnce(
      page(Array(200).fill({ ...history, delinquencyStatusChangedIndex: 0 })),
    )
    .mockResolvedValueOnce({ data: { markets: [], _meta: null } })
  expect(await fetchDefaultedMarkets(1)).toEqual({
    markets: {},
    unknown: [],
    asOfTimestamp: null,
  })
})

it("includes the timestamp of a non-default long-history lookup", async () => {
  mockQuery.mockResolvedValue(page([history]))
  jest.mocked(getMarketDefaultStatus).mockResolvedValue({
    market: address,
    source: "legacy-history",
    isDefaulted: false,
    asOfTimestamp: 800,
  })
  expect((await fetchDefaultedMarkets(1)).asOfTimestamp).toBe(800)
})

it.each([undefined, Math.floor(Date.now() / 1000) + 60])(
  "leaves a long history with invalid source time (%s) unknown without invalidating other addresses",
  async (asOfTimestamp) => {
    mockQuery.mockResolvedValue(page([history]))
    jest.mocked(getMarketDefaultStatus).mockResolvedValue({
      market: address,
      source: "legacy-history",
      isDefaulted: false,
      asOfTimestamp,
    })
    expect(await fetchDefaultedMarkets(1)).toEqual({
      markets: {},
      unknown: [address],
      asOfTimestamp: 1000,
    })
  },
)

it("cannot establish freshness from a future bulk-page timestamp", async () => {
  mockQuery.mockResolvedValue(page([], Math.floor(Date.now() / 1000) + 60))
  expect((await fetchDefaultedMarkets(1)).asOfTimestamp).toBeNull()
})

it("retains historical defaults without aging unrelated non-default evidence", async () => {
  mockQuery.mockResolvedValue(page([history]))
  jest.mocked(getMarketDefaultStatus).mockResolvedValue({
    market: address,
    source: "legacy-history",
    isDefaulted: true,
    defaultedAt: 200,
    asOfTimestamp: 500,
  })
  expect(await fetchDefaultedMarkets(1)).toEqual({
    markets: { [address]: { address, borrower, defaultedAt: 200 } },
    unknown: [],
    asOfTimestamp: 1000,
  })
})

it.each([undefined, -1, NaN, 1.5, "1000"])(
  "rejects malformed source timestamps (%s)",
  (asOfTimestamp) => {
    expect(
      isDefaultedMarketsData({ markets: {}, unknown: [], asOfTimestamp }),
    ).toBe(false)
  },
)
