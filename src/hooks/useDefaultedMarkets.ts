import { useMemo } from "react"

import {
  QueryClient,
  queryOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import {
  useIsSelectedNetworkRehydrated,
  useSelectedNetwork,
} from "@/hooks/useSelectedNetwork"
import {
  DefaultedMarketsData,
  fetchDefaultedMarkets,
  isDefaultedMarketsData,
} from "@/utils/defaultedMarkets"

export type { DefaultedMarket } from "@/utils/defaultedMarkets"

const REFRESH_INTERVAL = 5 * 60_000
const SEED_STORAGE_KEY = "wildcat:defaulted-markets:v1"
const SEED_MAX_AGE = 24 * 60 * 60_000

type DefaultedMarketsSeeds = Record<
  string,
  { savedAt: number; data: DefaultedMarketsData } | undefined
>

const readSeeds = (): DefaultedMarketsSeeds => {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(SEED_STORAGE_KEY) ?? "{}",
    )
    return parsed && typeof parsed === "object"
      ? (parsed as DefaultedMarketsSeeds)
      : {}
  } catch {
    return {}
  }
}

const writeSeed = (chainId: number, data: DefaultedMarketsData) => {
  try {
    const seeds = readSeeds()
    seeds[chainId] = { savedAt: Date.now(), data }
    window.localStorage.setItem(SEED_STORAGE_KEY, JSON.stringify(seeds))
    return true
  } catch {
    return false
  }
}

export const seedDefaultedMarkets = (queryClient: QueryClient) => {
  const now = Date.now()
  Object.entries(readSeeds()).forEach(([chainId, seed]) => {
    const queryKey = QueryKeys.Markets.GET_DEFAULTED_MARKETS(Number(chainId))
    if (
      !seed ||
      typeof seed.savedAt !== "number" ||
      seed.savedAt > now ||
      now - seed.savedAt > SEED_MAX_AGE ||
      !isDefaultedMarketsData(seed.data) ||
      queryClient.getQueryData(queryKey) !== undefined
    )
      return
    queryClient.setQueryData(queryKey, seed.data, {
      // Incomplete results must retry on reload, even within the cache window.
      updatedAt: seed.data.unknown.length ? 0 : seed.savedAt,
    })
  })
}

const fetchFromApi = async (
  chainId: SupportedChainId,
  signal: AbortSignal,
): Promise<DefaultedMarketsData> => {
  const response = await fetch(`/api/defaulted-markets?chainId=${chainId}`, {
    signal,
  })
  if (!response.ok)
    throw new Error(`Defaulted markets request failed: ${response.status}`)
  const data: unknown = await response.json()
  if (!isDefaultedMarketsData(data))
    throw new Error("Malformed defaulted markets response")
  const sourceTime = (data.asOfTimestamp ?? 0) * 1000
  if (sourceTime > Date.now() || Date.now() - sourceTime >= REFRESH_INTERVAL)
    throw new Error("Defaulted markets response is stale")
  return data
}

const loadDefaultedMarkets = async (
  chainId: SupportedChainId,
  signal: AbortSignal,
  queryClient: QueryClient,
) => {
  const data = await fetchFromApi(chainId, signal).catch((error) => {
    if (signal.aborted) throw error
    return fetchDefaultedMarkets(chainId, signal)
  })
  const previous = queryClient.getQueryData<DefaultedMarketsData>(
    QueryKeys.Markets.GET_DEFAULTED_MARKETS(chainId),
  )
  // Historical defaults survive cure/closure and incomplete refreshes.
  const markets = { ...previous?.markets, ...data.markets }
  const merged = {
    markets,
    unknown: data.unknown.filter((address) => !(address in markets)),
    asOfTimestamp: data.asOfTimestamp,
  }
  writeSeed(chainId, merged)
  return merged
}

export const defaultedMarketsQueryOptions = (
  chainId: SupportedChainId,
  queryClient: QueryClient,
) => {
  const queryKey = QueryKeys.Markets.GET_DEFAULTED_MARKETS(chainId)
  const cached = queryClient.getQueryState<DefaultedMarketsData>(queryKey)
  const sourceTime = cached?.data?.asOfTimestamp
  const staleTime =
    sourceTime != null && sourceTime * 1000 <= Date.now()
      ? Math.max(
          0,
          Math.min(
            REFRESH_INTERVAL,
            sourceTime * 1000 + REFRESH_INTERVAL - (cached?.dataUpdatedAt ?? 0),
          ),
        )
      : 0

  return queryOptions({
    queryKey,
    queryFn: ({ signal }) => loadDefaultedMarkets(chainId, signal, queryClient),
    // A new HTTP receipt must not renew the age of the indexed evidence.
    staleTime,
    // Recompute staleTime on receipt even when the response is identical.
    structuralSharing: false,
    refetchInterval: (query) => {
      const timestamp = query.state.data?.asOfTimestamp
      const remaining = (timestamp ?? 0) * 1000 + REFRESH_INTERVAL - Date.now()
      return remaining > 0
        ? Math.min(remaining + 1, REFRESH_INTERVAL)
        : REFRESH_INTERVAL
    },
    retry: 1,
  })
}

/**
 * Historical defaults on a chain. A default stays recorded after cure or
 * closure. `isDefaulted` returns undefined when the status is unknown; new
 * deposits/borrowing require an explicit false, not just a finished request.
 * Non-default status expires five minutes after the indexed source block;
 * receiving the same snapshot again does not extend that deadline.
 */
export const useDefaultedMarkets = (chainId?: number) => {
  const queryClient = useQueryClient()
  const { chainId: selectedChainId } = useSelectedNetwork()
  const isNetworkRehydrated = useIsSelectedNetworkRehydrated()
  const targetChainId = (chainId ?? selectedChainId) as SupportedChainId
  const enabled = chainId !== undefined || isNetworkRehydrated

  const query = useQuery({
    ...defaultedMarketsQueryOptions(targetChainId, queryClient),
    enabled,
    refetchOnWindowFocus: false,
  })

  return useMemo(() => {
    const markets = query.data?.markets ?? {}
    const hasData = query.data !== undefined
    const hasFailed = query.isError || query.errorUpdateCount > 0
    const unknown = new Set(query.data?.unknown ?? [])
    const byBorrower: Record<string, string[]> = {}
    Object.values(markets).forEach((market) => {
      byBorrower[market.borrower] = [
        ...(byBorrower[market.borrower] ?? []),
        market.address,
      ]
    })

    return {
      isLoading: !hasData && query.isPending && !hasFailed,
      isError: query.isError || (!hasData && hasFailed) || unknown.size > 0,
      defaultedMarkets: markets,
      isDefaulted: (marketAddress?: string): boolean | undefined => {
        if (!marketAddress) return undefined
        const address = marketAddress.toLowerCase()
        if (address in markets) return true
        if (
          !enabled ||
          !hasData ||
          query.isError ||
          query.isStale ||
          unknown.has(address)
        )
          return undefined
        return false
      },
      defaultedAt: (marketAddress?: string) =>
        marketAddress
          ? markets[marketAddress.toLowerCase()]?.defaultedAt
          : undefined,
      defaultedMarketsOfBorrower: (borrowerAddress?: string) =>
        (borrowerAddress && byBorrower[borrowerAddress.toLowerCase()]) || [],
    }
  }, [
    enabled,
    query.data,
    query.isStale,
    query.isPending,
    query.isError,
    query.errorUpdateCount,
  ])
}
