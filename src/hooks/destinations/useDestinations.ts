import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"
import { supportsDestinations } from "@/lib/destinations/constants"
import { pruneExpired } from "@/lib/destinations/freshness"
import type {
  Destination,
  DestinationsResponse,
} from "@/lib/destinations/types"

const STALE_TIME_MS = 5 * 60 * 1000

const NO_DESTINATIONS: Destination[] = []
const NO_MARKETS: Record<string, Destination[]> = {}

export type DestinationsState = {
  data: DestinationsResponse | undefined
  markets: Record<string, Destination[]>
  stale: boolean
  isLoading: boolean
  isError: boolean
}

export const useDestinations = (
  chainId: number | undefined,
): DestinationsState => {
  const query = useQuery({
    queryKey: QueryKeys.Destinations.BY_CHAIN(chainId ?? 0),
    enabled: !!chainId && supportsDestinations(chainId),
    staleTime: STALE_TIME_MS,
    refetchInterval: STALE_TIME_MS,
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

  const { data, dataUpdatedAt, errorUpdatedAt } = query
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

  return {
    data,
    markets,
    stale: !!data?.stale || query.isRefetchError,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}

export const useMarketDestinations = (
  chainId: number | undefined,
  marketAddress: string | undefined,
) => {
  const state = useDestinations(chainId)
  const destinations =
    (marketAddress && state.markets[marketAddress.toLowerCase()]) ||
    NO_DESTINATIONS
  return { ...state, destinations }
}
