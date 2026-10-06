import {
  isCompatibleMarketPayload,
  recoverIncompatibleMarketPayload,
} from "./cache"

describe("market API cache compatibility", () => {
  it("accepts zero and non-zero total assets", () => {
    expect(isCompatibleMarketPayload({ totalAssets: "0" })).toBe(true)
    expect(isCompatibleMarketPayload({ totalAssets: "2688770183730" })).toBe(
      true,
    )
  })

  it("rejects missing or malformed total assets", () => {
    expect(isCompatibleMarketPayload({})).toBe(false)
    expect(isCompatibleMarketPayload({ totalAssets: undefined })).toBe(false)
    expect(isCompatibleMarketPayload({ totalAssets: "" })).toBe(false)
    expect(isCompatibleMarketPayload({ totalAssets: "not-a-number" })).toBe(
      false,
    )
  })

  it("returns compatible cached data without refetching", async () => {
    const fetchFresh = jest.fn()
    const cached = {
      chainId: 1,
      market: { id: "market", totalAssets: "0" },
    }

    await expect(
      recoverIncompatibleMarketPayload(cached, fetchFresh),
    ).resolves.toBe(cached)
    expect(fetchFresh).not.toHaveBeenCalled()
  })

  it("replaces an incompatible cached payload with fresh data", async () => {
    const cached = { chainId: 1, market: { id: "market" } }
    const fresh = {
      chainId: 1,
      market: { id: "market", totalAssets: "123" },
    }
    const fetchFresh = jest.fn().mockResolvedValue(fresh)

    await expect(
      recoverIncompatibleMarketPayload(cached, fetchFresh),
    ).resolves.toBe(fresh)
    expect(fetchFresh).toHaveBeenCalledTimes(1)
  })

  it("does not return an incompatible fresh payload", async () => {
    const cached = { chainId: 1, market: { id: "market" } }
    const fetchFresh = jest
      .fn()
      .mockResolvedValue({ chainId: 1, market: { id: "market" } })

    await expect(
      recoverIncompatibleMarketPayload(cached, fetchFresh),
    ).rejects.toThrow("Market payload is missing required fields")
  })
})
