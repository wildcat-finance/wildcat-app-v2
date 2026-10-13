/** @jest-environment node */

import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import type { AdapterOutput, DestinationAdapter } from "./adapters/types"
import type { WildcatToken } from "./universe"
import { CACHE_TTL_MS, FAILURE_BACKOFF_MS } from "../constants"

const TOKEN: WildcatToken = {
  market: "0x1111111111111111111111111111111111111111",
  asset: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  borrower: "0x2222222222222222222222222222222222222222",
  wrapper: "0x3333333333333333333333333333333333333333",
}

const load = jest.fn<Promise<AdapterOutput[]>, []>()

jest.mock("./adapters", () => ({
  ADAPTERS: [
    {
      platform: "morpho-blue",
      accepts: ["wrapper"],
      load: () => load(),
    } satisfies DestinationAdapter,
  ],
}))
jest.mock("./universe", () => ({
  ...jest.requireActual("./universe"),
  getWildcatTokens: jest.fn(async () => [TOKEN]),
}))
jest.mock("./affiliation", () => ({
  loadBorrowerIdentities: jest.fn(async () => new Map()),
  resolveAffiliation: () => ({ kind: "not_reviewed" }),
}))

const venue = (): AdapterOutput => ({
  venueKey: "0xabc",
  destination: {
    route: "BORROW_AGAINST",
    title: "Vault",
    token: { address: TOKEN.wrapper, symbol: "wTOKEN", form: "wrapper" },
    loanAsset: { address: TOKEN.asset },
    url: "https://app.morpho.org/ethereum/variable/0xabc/usdc-wtoken",
    curators: [],
    figures: {
      lltv: 0.86,
      borrowApy: 0.05,
      availableLiquidityUsd: 500_000,
      asOf: Math.floor(Date.now() / 1000),
    },
    notices: [],
  },
  counterparties: [],
})

const MINUTE = 60 * 1000

describe("getDestinations", () => {
  let getDestinations: typeof import("./getDestinations").getDestinations
  // Loaded with getDestinations so its instanceof check sees the same class.
  let rateLimited: (retryAfterMs: number) => Error

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date("2026-10-13T12:00:00Z") })
    jest.spyOn(console, "error").mockImplementation(() => {})
    load.mockReset()
    jest.isolateModules(() => {
      /* eslint-disable global-require, @typescript-eslint/no-var-requires */
      ;({ getDestinations } = require("./getDestinations"))
      const { SubgraphHttpError } = require("@/lib/protocol-stats/subgraph")
      /* eslint-enable global-require, @typescript-eslint/no-var-requires */
      rateLimited = (retryAfterMs: number) =>
        new SubgraphHttpError(429, "https://api.morpho.org", retryAfterMs, "")
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it("serves a healthy build from memory until its TTL", async () => {
    load.mockImplementation(async () => [venue()])

    const first = await getDestinations(SupportedChainId.Mainnet)
    expect(first.refreshAt).toBe(Date.now() + CACHE_TTL_MS)
    expect(first.payload.markets[TOKEN.market.toLowerCase()]).toHaveLength(1)

    jest.advanceTimersByTime(CACHE_TTL_MS - 1)
    await getDestinations(SupportedChainId.Mainnet)
    expect(load).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(1)
    await getDestinations(SupportedChainId.Mainnet)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it("retries a failed platform after the failure backoff", async () => {
    load.mockImplementationOnce(async () => [venue()])
    await getDestinations(SupportedChainId.Mainnet)

    jest.advanceTimersByTime(CACHE_TTL_MS)
    load.mockRejectedValueOnce(new Error("upstream down"))
    const failed = await getDestinations(SupportedChainId.Mainnet)

    expect(failed.payload.stalePlatforms).toEqual(["morpho-blue"])
    expect(failed.payload.markets[TOKEN.market.toLowerCase()]).toHaveLength(1)
    expect(failed.refreshAt).toBe(Date.now() + FAILURE_BACKOFF_MS)
  })

  it("does not rebuild every backoff while a platform is paused", async () => {
    load.mockImplementationOnce(async () => [venue()])
    await getDestinations(SupportedChainId.Mainnet)

    jest.advanceTimersByTime(CACHE_TTL_MS)
    load.mockRejectedValueOnce(rateLimited(10 * MINUTE))
    const paused = await getDestinations(SupportedChainId.Mainnet)
    expect(paused.payload.stalePlatforms).toEqual(["morpho-blue"])
    expect(paused.refreshAt).toBe(Date.now() + CACHE_TTL_MS)

    // Still inside the pause: the rebuild keeps the last venues without
    // calling the platform.
    jest.advanceTimersByTime(CACHE_TTL_MS)
    const stillPaused = await getDestinations(SupportedChainId.Mainnet)
    expect(load).toHaveBeenCalledTimes(2)
    expect(stillPaused.payload.stalePlatforms).toEqual(["morpho-blue"])
    expect(stillPaused.refreshAt).toBe(Date.now() + CACHE_TTL_MS)

    jest.advanceTimersByTime(CACHE_TTL_MS)
    load.mockImplementationOnce(async () => [venue()])
    const recovered = await getDestinations(SupportedChainId.Mainnet)
    expect(load).toHaveBeenCalledTimes(3)
    expect(recovered.payload.stalePlatforms).toEqual([])
  })
})
