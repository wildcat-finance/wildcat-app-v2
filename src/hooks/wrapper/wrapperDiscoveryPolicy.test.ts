import {
  WRAPPER_DISCOVERY_REFETCH_INTERVAL,
  getWrapperDiscoveryAttentionRefetch,
  getWrapperDiscoveryRefetchInterval,
} from "./wrapperDiscoveryPolicy"

describe("wrapper discovery refresh policy", () => {
  it("periodically and attention-refetches a missing wrapper", () => {
    expect(getWrapperDiscoveryRefetchInterval(false)).toBe(
      WRAPPER_DISCOVERY_REFETCH_INTERVAL,
    )
    expect(getWrapperDiscoveryAttentionRefetch(false)).toBe("always")
  })

  it("stops automatic discovery after finding the immutable wrapper", () => {
    expect(getWrapperDiscoveryRefetchInterval(true)).toBe(false)
    expect(getWrapperDiscoveryAttentionRefetch(true)).toBe(false)
  })
})
