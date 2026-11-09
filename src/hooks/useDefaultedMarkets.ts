import { useMemo } from "react"

import {
  QueryClient,
  queryOptions,
  replaceEqualDeep,
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

// A not-defaulted result permits actions for this long after the indexed block
// it was read at. Past that, the index is too far behind to act on.
const FRESH_WINDOW = 5 * 60_000
// Refresh cadence while the status is healthy. Renewing well inside
// FRESH_WINDOW keeps a clear status from lapsing between refreshes, so an
// action is never locked while refreshes succeed.
const REFRESH_INTERVAL = 60_000
// A snapshot with less than this left is renewed at the faster cadence.
const REFRESH_LEAD = 2 * 60_000
// Cadence while the status is expired or the last refresh failed.
const RETRY_INTERVAL = 15_000
const REQUEST_TIMEOUT = 15_000
// v1 seeds could carry defaults that a complete refresh had already dropped.
const SEED_STORAGE_KEY = "wildcat:defaulted-markets:v2"
const LEGACY_SEED_STORAGE_KEYS = ["wildcat:defaulted-markets:v1"]
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
  try {
    LEGACY_SEED_STORAGE_KEYS.forEach((legacyKey) =>
      window.localStorage.removeItem(legacyKey),
    )
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
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
    // An incomplete seed is retried on reload by prefetchDefaultedMarkets. It
    // is not aged here: that would lock every market the seed still clears.
    queryClient.setQueryData(queryKey, seed.data, { updatedAt: seed.savedAt })
  })
}

const MAX_FUTURE_SKEW = 30_000

let clockOffset = 0

const learnClockOffset = (response: Response) => {
  const date = Date.parse(response.headers?.get("date") ?? "")
  if (!Number.isFinite(date)) return
  const age = Number(response.headers.get("age") ?? 0)
  clockOffset = date + (Number.isFinite(age) ? age : 0) * 1000 - Date.now()
}

const freshUntil = (data: DefaultedMarketsData | undefined) => {
  if (data?.asOfTimestamp == null) return 0
  const source = data.asOfTimestamp * 1000 - clockOffset
  if (source > Date.now() + MAX_FUTURE_SKEW) return 0
  return source + FRESH_WINDOW
}

// A stalled request must not hold back the next refresh attempt.
const withTimeout = async <T>(
  signal: AbortSignal,
  run: (timed: AbortSignal) => Promise<T>,
): Promise<T> => {
  const controller = new AbortController()
  const cancel = () => controller.abort(signal.reason)
  const timer = setTimeout(
    () => controller.abort(new Error("Default status request timed out")),
    REQUEST_TIMEOUT,
  )
  const aborted = new Promise<never>((_, reject) => {
    controller.signal.addEventListener("abort", () =>
      reject(controller.signal.reason),
    )
  })
  if (signal.aborted) cancel()
  else signal.addEventListener("abort", cancel)
  try {
    return await Promise.race([run(controller.signal), aborted])
  } finally {
    clearTimeout(timer)
    signal.removeEventListener("abort", cancel)
  }
}

const fetchFromApi = async (
  chainId: SupportedChainId,
  signal: AbortSignal,
): Promise<DefaultedMarketsData> => {
  const response = await fetch(`/api/defaulted-markets?chainId=${chainId}`, {
    signal,
  })
  learnClockOffset(response)
  if (!response.ok)
    throw new Error(`Defaulted markets request failed: ${response.status}`)
  const data: unknown = await response.json()
  if (!isDefaultedMarketsData(data))
    throw new Error("Malformed defaulted markets response")
  if (freshUntil(data) <= Date.now())
    throw new Error("Defaulted markets response is stale")
  return data
}

const loadDefaultedMarkets = async (
  chainId: SupportedChainId,
  signal: AbortSignal,
  queryClient: QueryClient,
) => {
  const data = await withTimeout(signal, (timed) =>
    fetchFromApi(chainId, timed),
  ).catch((error) => {
    if (signal.aborted) throw error
    return withTimeout(signal, (timed) =>
      fetchDefaultedMarkets(chainId, timed, clockOffset),
    )
  })
  const previous = queryClient.getQueryData<DefaultedMarketsData>(
    QueryKeys.Markets.GET_DEFAULTED_MARKETS(chainId),
  )
  // A refresh must never leave actions worse off than no refresh. While the
  // held snapshot still clears actions, only newer evidence replaces it; an
  // older or undated result would lock markets the held one proves clear.
  if (
    previous &&
    freshUntil(previous) > Date.now() &&
    (data.asOfTimestamp ?? -1) < (previous.asOfTimestamp ?? -1)
  )
    return previous
  // The source replays full history, so cured or closed defaults are still
  // reported. A refresh is authoritative for every market it resolved; earlier
  // defaults are carried over only for markets it could not resolve.
  const markets = { ...data.markets }
  data.unknown.forEach((address) => {
    const known = previous?.markets[address]
    if (known && !(address in markets)) markets[address] = known
  })
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
  const staleTime = Math.max(
    0,
    Math.min(
      FRESH_WINDOW,
      freshUntil(cached?.data) - (cached?.dataUpdatedAt ?? 0),
    ),
  )

  return queryOptions({
    queryKey,
    queryFn: ({ signal }) => loadDefaultedMarkets(chainId, signal, queryClient),
    // A new HTTP receipt must not renew the age of the indexed evidence.
    staleTime,
    // Every receipt yields a new snapshot object, so staleTime is recomputed
    // even for an identical response. Unchanged `markets` and `unknown` keep
    // their identity, so consumers only see a change when one happened.
    structuralSharing: (previous, next) => {
      const shared = replaceEqualDeep(previous, next)
      return shared === previous && isDefaultedMarketsData(shared)
        ? { ...shared }
        : shared
    },
    // Renew ahead of expiry so a clear status does not lapse while a refresh is
    // in flight, and recover quickly once it has lapsed or a refresh failed.
    refetchInterval: ({ state }) => {
      const remaining = freshUntil(state.data) - Date.now()
      if (state.status === "error" || remaining <= 0) return RETRY_INTERVAL
      return Math.min(
        REFRESH_INTERVAL,
        Math.max(RETRY_INTERVAL, remaining - REFRESH_LEAD),
      )
    },
    // A hidden tab keeps its status current, so returning to it does not lock
    // actions while a refresh catches up.
    refetchIntervalInBackground: true,
    // Each attempt already tries the API and then the subgraph. The library's
    // own retry pauses while the tab is hidden, which would stall the cadence
    // above after one failure, so failures wait for RETRY_INTERVAL instead.
    retry: false,
  })
}

export const prefetchDefaultedMarkets = (
  queryClient: QueryClient,
  chainId: SupportedChainId,
) => {
  const options = defaultedMarketsQueryOptions(chainId, queryClient)
  const held = queryClient.getQueryData<DefaultedMarketsData>(options.queryKey)
  return queryClient.prefetchQuery({
    ...options,
    // Markets a seed left unresolved are retried at once. The rest of the seed
    // stays in force meanwhile.
    staleTime: held?.unknown.length ? 0 : options.staleTime,
  })
}

/**
 * Historical defaults on a chain. A default stays recorded after cure or
 * closure.
 *
 * Actions and display read the same snapshot differently:
 *
 * `isDefaulted` gates actions and fails closed. It returns true for a
 * confirmed default, false only while the market is proven not defaulted, and
 * undefined otherwise; new deposits/borrowing require an explicit false. The
 * proof lasts five minutes past the indexed source block and depends on that
 * age alone: a failed refresh neither ends it early nor extends it, and
 * receiving the same snapshot again does not extend it. The snapshot is
 * renewed well before then, so the result changes only on a real transition.
 *
 * `isDefaultedForDisplay` reads the last snapshot without that expiry, so
 * listings and status chips do not blank out when the proof lapses. Nothing
 * is shown as defaulted unless a snapshot confirmed it. It must never gate an
 * action; use `isDefaulted` for that.
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
    // Timers stall while a device sleeps or a browser suspends the tab. Refetch
    // on return (only fires when stale) rather than wait for the next interval.
    refetchOnWindowFocus: true,
  })

  const snapshotMarkets = query.data?.markets
  const snapshotUnknown = query.data?.unknown
  const hasData = query.data !== undefined
  const hasStatus = enabled && hasData
  // The proof follows the age of the indexed evidence alone. A failed refresh
  // leaves an unexpired snapshot in force and cannot revive an expired one.
  const isProofCurrent = hasStatus && !query.isStale
  const hasFailed = query.isError || query.errorUpdateCount > 0
  const isLoading = !hasData && query.isPending && !hasFailed
  // Display only. A failed refresh shows once the snapshot it failed to renew
  // has also expired, not on every blip.
  const isError =
    (!hasData && hasFailed) ||
    (query.isError && query.isStale) ||
    !!snapshotUnknown?.length

  // These inputs change only on a real transition, so the functions below keep
  // their identity across refreshes that found nothing new.
  return useMemo(() => {
    const markets = snapshotMarkets ?? {}
    const unknown = new Set(snapshotUnknown ?? [])
    const byBorrower: Record<string, string[]> = {}
    Object.values(markets).forEach((market) => {
      byBorrower[market.borrower] = [
        ...(byBorrower[market.borrower] ?? []),
        market.address,
      ]
    })

    return {
      isLoading,
      isError,
      hasStatus,
      defaultedMarkets: markets,
      isDefaulted: (marketAddress?: string): boolean | undefined => {
        if (!marketAddress) return undefined
        const address = marketAddress.toLowerCase()
        if (address in markets) return true
        if (!isProofCurrent || unknown.has(address)) return undefined
        return false
      },
      isDefaultedForDisplay: (marketAddress?: string): boolean | undefined => {
        if (!marketAddress) return undefined
        const address = marketAddress.toLowerCase()
        if (address in markets) return true
        if (!hasStatus || unknown.has(address)) return undefined
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
    snapshotMarkets,
    snapshotUnknown,
    hasStatus,
    isProofCurrent,
    isLoading,
    isError,
  ])
}
