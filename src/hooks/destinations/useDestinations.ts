import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"
import { useIsSelectedNetworkRehydrated } from "@/hooks/useSelectedNetwork"
import { CACHE_TTL_MS } from "@/lib/destinations/constants"
import { isStale, pruneExpired } from "@/lib/destinations/freshness"
import { supportsDestinations } from "@/lib/destinations/platforms"
import type {
  Destination,
  DestinationPlatform,
  DestinationsResponse,
} from "@/lib/destinations/types"

const NO_DESTINATIONS: Destination[] = []
const NO_MARKETS: Record<string, Destination[]> = {}
const NO_PLATFORMS: DestinationPlatform[] = []

export type DestinationsState = {
  data: DestinationsResponse | undefined
  markets: Record<string, Destination[]>
  /** Every row is last-known data; use isStale() for the rows of one market */
  refreshFailed: boolean
  stalePlatforms: DestinationPlatform[]
  isLoading: boolean
  isError: boolean
}

export const useDestinations = (
  chainId: number | undefined,
): DestinationsState => {
  const isSelectedNetworkRehydrated = useIsSelectedNetworkRehydrated()
  const supported = !!chainId && supportsDestinations(chainId)
  const query = useQuery({
    queryKey: QueryKeys.Destinations.BY_CHAIN(chainId ?? 0),
    enabled: isSelectedNetworkRehydrated && supported,
    staleTime: CACHE_TTL_MS,
    refetchInterval: CACHE_TTL_MS,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async (): Promise<DestinationsResponse> => {
      const response = await fetch(`/api/destinations?chainId=${chainId}`)
      if (!response.ok) {
        throw new Error(`Destinations request failed: ${response.status}`)
      }
      return response.json()
    },
  })

  const {
    data,
    dataUpdatedAt,
    errorUpdatedAt,
    isLoading,
    isError,
    isRefetchError,
  } = query
  const markets = useMemo(
    () =>
      data
        ? pruneExpired(
            data.markets,
            Math.max(dataUpdatedAt, errorUpdatedAt) / 1000,
          )
        : NO_MARKETS,
    [data, dataUpdatedAt, errorUpdatedAt],
  )

  // One object per change, so the tables can hand it to every row through
  // context without re-rendering them on unrelated renders.
  return useMemo(
    () => ({
      data,
      markets,
      refreshFailed: !!data?.stale || isRefetchError,
      stalePlatforms: data?.stalePlatforms ?? NO_PLATFORMS,
      isLoading,
      isError,
    }),
    [data, markets, isRefetchError, isLoading, isError],
  )
}

export const useMarketDestinations = (
  chainId: number | undefined,
  marketAddress: string | undefined,
) => {
  const state = useDestinations(chainId)
  const destinations =
    (marketAddress && state.markets[marketAddress.toLowerCase()]) ||
    NO_DESTINATIONS
  return { ...state, destinations, stale: isStale(destinations, state) }
}
