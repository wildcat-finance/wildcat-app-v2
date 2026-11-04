/** @jest-environment node */
import { fetchTokensList } from "./services"
import { INK_SEPOLIA_TOKENS } from "./tokens-list/ink-sepolia"
import { PLASMA_TESTNET_TOKENS } from "./tokens-list/plasma-testnet"
import { SEPOLIA_TOKENS } from "./tokens-list/sepolia"

jest.mock("next/cache", () => ({
  // Run the real loader; Next's cache requires a request context.
  unstable_cache: (loader: unknown) => loader,
}))

describe("testnet token lists", () => {
  const originalListUrl = process.env.NEXT_PUBLIC_TOKENS_LIST_URL

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_TOKENS_LIST_URL
    jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("unexpected fetch"))
  })

  afterEach(() => {
    jest.restoreAllMocks()
    if (originalListUrl === undefined) {
      delete process.env.NEXT_PUBLIC_TOKENS_LIST_URL
    } else {
      process.env.NEXT_PUBLIC_TOKENS_LIST_URL = originalListUrl
    }
  })

  it("returns the five Ink mocks without an external token list", async () => {
    const tokens = await fetchTokensList("", 763373)
    expect(tokens).toEqual(INK_SEPOLIA_TOKENS)
    expect(tokens.map(({ symbol }) => symbol)).toEqual([
      "WETH",
      "USDC",
      "DAI",
      "USDT",
      "WBTC",
    ])
    expect(new Set(tokens.map(({ address }) => address)).size).toBe(5)
    tokens.forEach((token) => {
      expect(token).toMatchObject({ chainId: 763373, decimals: 18 })
      expect(token.address).toMatch(/^0x[0-9a-f]{40}$/)
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    ["usdc", "USDC"],
    ["wrapped btc", "WBTC"],
    ["0x9E570C", "USDC"],
  ])("filters Ink tokens by %s", async (query, symbol) => {
    const tokens = await fetchTokensList(query, 763373)
    expect(tokens).toHaveLength(1)
    expect(tokens[0].symbol).toBe(symbol)
  })

  it("keeps existing testnet lists separate", async () => {
    expect(await fetchTokensList("", 11155111)).toEqual(SEPOLIA_TOKENS)
    expect(await fetchTokensList("", 9746)).toEqual(PLASMA_TESTNET_TOKENS)
    expect(await fetchTokensList("", 763373)).toEqual(INK_SEPOLIA_TOKENS)
    expect(fetch).not.toHaveBeenCalled()
  })
})
