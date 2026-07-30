import { getMarketLiveDataStatus } from "./marketLiveData"

describe("getMarketLiveDataStatus", () => {
  it("waits for the first live snapshot", () => {
    expect(
      getMarketLiveDataStatus({ hasLiveData: false, hasError: false }),
    ).toBe("loading")
  })

  it("reports an initial live-read failure as unavailable", () => {
    expect(
      getMarketLiveDataStatus({ hasLiveData: false, hasError: true }),
    ).toBe("unavailable")
  })

  it("keeps the last valid live snapshot visible after a refresh error", () => {
    expect(getMarketLiveDataStatus({ hasLiveData: true, hasError: true })).toBe(
      "ready",
    )
  })
})
