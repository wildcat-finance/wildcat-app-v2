export const WRAPPER_DISCOVERY_REFETCH_INTERVAL = 60_000

// Wrapper registration is write-once. A missing wrapper can still be deployed
// externally, so negative discovery remains refreshable.
export const getWrapperDiscoveryRefetchInterval = (
  hasWrapper: boolean,
): number | false => (hasWrapper ? false : WRAPPER_DISCOVERY_REFETCH_INTERVAL)

export const getWrapperDiscoveryAttentionRefetch = (
  hasWrapper: boolean,
): false | "always" => (hasWrapper ? false : "always")
