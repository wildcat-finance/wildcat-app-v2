import * as React from "react"

import { QueryClient, useQueryClient } from "@tanstack/react-query"
import { Market, MarketRecordKind } from "@wildcatfi/wildcat-sdk"

import {
  ALL_MARKET_RECORD_KINDS,
  DEFAULT_MARKET_RECORDS_PAGE,
  DEFAULT_MARKET_RECORDS_PAGE_SIZE,
} from "@/components/PaginatedMarketRecordsTable/constants"

import {
  fetchMarketRecordsPage,
  getMarketRecordsQueryKey,
  MARKET_RECORDS_QUERY_STALE_TIME,
} from "./useMarketRecords"

type PrefetchMarketRecordsOptions = {
  market: Market
  page?: number
  pageSize?: number
  kinds?: MarketRecordKind[]
  search?: string
}

export function prefetchMarketRecords(
  queryClient: QueryClient,
  {
    market,
    page = DEFAULT_MARKET_RECORDS_PAGE,
    pageSize = DEFAULT_MARKET_RECORDS_PAGE_SIZE,
    kinds = ALL_MARKET_RECORD_KINDS,
    search = "",
  }: PrefetchMarketRecordsOptions,
) {
  const query = {
    market,
    page,
    pageSize,
    kinds,
    search,
  }

  return queryClient.prefetchQuery({
    queryKey: getMarketRecordsQueryKey(query),
    queryFn: () => fetchMarketRecordsPage(query),
    staleTime: MARKET_RECORDS_QUERY_STALE_TIME,
  })
}

export function usePrefetchMarketRecords(market: Market | undefined) {
  const queryClient = useQueryClient()

  return React.useCallback(() => {
    if (!market) return
    prefetchMarketRecords(queryClient, { market }).catch(() => undefined)
  }, [market, queryClient])
}

export function useIdlePrefetchMarketRecords(market: Market | undefined) {
  const prefetchMarketHistory = usePrefetchMarketRecords(market)
  const prefetchedMarketKeyRef = React.useRef<string | undefined>(undefined)

  React.useEffect(() => {
    if (!market || typeof window === "undefined") return undefined

    const marketKey = `${market.chainId}:${market.address.toLowerCase()}`
    if (prefetchedMarketKeyRef.current === marketKey) return undefined

    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let idleId: number | undefined
    const runPrefetch = () => {
      prefetchedMarketKeyRef.current = marketKey
      prefetchMarketHistory()
    }

    const idleWindow = window as Window &
      typeof globalThis & {
        requestIdleCallback?: (
          callback: () => void,
          options?: { timeout?: number },
        ) => number
        cancelIdleCallback?: (handle: number) => void
      }

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(runPrefetch, {
        timeout: 3000,
      })
    } else {
      timeoutId = setTimeout(runPrefetch, 1500)
    }

    return () => {
      if (idleId !== undefined && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleId)
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
    }
  }, [market, prefetchMarketHistory])
}
