import type { DestinationPlatform } from "./types"

// Client-safe: the hook gates its query on these chains and the server picks
// the adapters to run from them.
export const PLATFORMS: Record<
  DestinationPlatform,
  { name: string; chainIds: readonly number[] }
> = {
  "morpho-blue": { name: "Morpho", chainIds: [1] },
}

export const supportsDestinations = (chainId: number) =>
  Object.values(PLATFORMS).some(({ chainIds }) => chainIds.includes(chainId))
