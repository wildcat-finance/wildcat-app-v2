import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"
import {
  DESTINATIONS_ENABLED,
  MAX_DATA_AGE_SEC,
} from "@/lib/destinations/constants"
import type {
  Destination,
  DestinationsResponse,
} from "@/lib/destinations/types"

const STALE_TIME_MS = 5 * 60 * 1000

const NO_DESTINATIONS: Destination[] = []
const NO_MARKETS: Record<string, Destination[]> = {}

export const useDestinations = (chainId: number | undefined) => {
  const query = useQuery({
    queryKey: QueryKeys.Destinations.BY_CHAIN(chainId ?? 0),
    enabled: DESTINATIONS_ENABLED && !!chainId,
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

  const { data, errorUpdatedAt } = query
  const markets = useMemo(() => {
    if (!data) return NO_MARKETS
    const nowSec = Date.now() / 1000
    const fresh: Record<string, Destination[]> = {}
    Object.entries(data.markets).forEach(([market, destinations]) => {
      const current = destinations.filter(
        (destination) => nowSec - destination.figures.asOf <= MAX_DATA_AGE_SEC,
      )
      if (current.length > 0) fresh[market] = current
    })
    return fresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, errorUpdatedAt])

  return {
    ...query,
    markets,
    stale: !!data?.stale || query.isRefetchError,
  }
}

export const useMarketDestinations = (
  chainId: number | undefined,
  marketAddress: string | undefined,
) => {
  const query = useDestinations(chainId)
  const destinations =
    (marketAddress && query.markets[marketAddress.toLowerCase()]) ||
    NO_DESTINATIONS
  return { ...query, destinations }
}
