import { useEffect } from "react"

import { useInfiniteQuery } from "@tanstack/react-query"
import {
  Market,
  MarketRecord,
  MarketRecordKind,
  getMarketRecords,
  getSubgraphClient,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

import { MARKET_RECORDS_RECENT_WINDOW_LIMIT } from "../constants"

export type UseMarketRecordsProps = {
  market: Market
  page: number
  pageSize: number
  kinds?: MarketRecordKind[]
  search?: string
}
export const MARKET_RECORDS_QUERY_STALE_TIME = 60 * 1000

export type MarketRecordsWindowResult = {
  records: MarketRecord[]
  windowStartEventIndex?: number
  windowEndEventIndex?: number
}

function getRecordKind(record: MarketRecord) {
  // GraphQL unions expose the record kind through __typename.
  // eslint-disable-next-line no-underscore-dangle
  return record.__typename
}

export const getMarketRecordsQueryKey = ({
  market,
}: Pick<UseMarketRecordsProps, "market">) =>
  QueryKeys.Markets.GET_MARKET_RECORDS(
    market.chainId,
    market.address,
    0,
    MARKET_RECORDS_RECENT_WINDOW_LIMIT,
    undefined,
    "recent-window",
  )

export async function fetchMarketRecordsWindow({
  market,
  targetChainId,
  endEventIndex,
}: Pick<UseMarketRecordsProps, "market"> & {
  targetChainId?: number
  endEventIndex?: number
}): Promise<MarketRecordsWindowResult> {
  const subgraphClient = getSubgraphClient(targetChainId ?? market.chainId)
  const windowEndEventIndex = endEventIndex ?? market.eventIndex
  const windowStartEventIndex =
    windowEndEventIndex === undefined
      ? undefined
      : Math.max(0, windowEndEventIndex - MARKET_RECORDS_RECENT_WINDOW_LIMIT)

  const records = await getMarketRecords(subgraphClient, {
    market,
    fetchPolicy: "network-only",
    endEventIndex: windowEndEventIndex,
    limit: MARKET_RECORDS_RECENT_WINDOW_LIMIT,
    additionalFilter:
      windowStartEventIndex === undefined
        ? undefined
        : { eventIndex_gte: windowStartEventIndex },
  })

  records.sort((a, b) => b.eventIndex - a.eventIndex)

  return {
    records,
    windowStartEventIndex,
    windowEndEventIndex,
  }
}

export function getNextMarketRecordsWindowParam(
  lastPage: MarketRecordsWindowResult,
) {
  const { windowStartEventIndex } = lastPage
  return windowStartEventIndex && windowStartEventIndex > 0
    ? windowStartEventIndex
    : undefined
}

function filterMarketRecords({
  records,
  kinds,
  search,
}: {
  records: MarketRecord[]
  kinds?: MarketRecordKind[]
  search?: string
}) {
  const selectedKindSet = kinds?.length ? new Set(kinds) : undefined
  const kindFiltered = selectedKindSet
    ? records.filter((r) => selectedKindSet.has(getRecordKind(r)))
    : records
  const q = search?.trim().toLowerCase()

  return q
    ? kindFiltered.filter((r) => {
        const haystack = [r.transactionHash, String(r.eventIndex)]
          .filter(Boolean)
          .map((x) => String(x).toLowerCase())

        return haystack.some((s) => s.includes(q))
      })
    : kindFiltered
}

export function useMarketRecords({
  market,
  page,
  pageSize,
  kinds,
  search,
}: UseMarketRecordsProps) {
  const { chainId } = useSelectedNetwork()
  const targetChainId = market?.chainId ?? chainId

  const getMarketRecordsInternal = async ({
    pageParam,
  }: {
    pageParam?: number
  }) =>
    fetchMarketRecordsWindow({
      market,
      targetChainId,
      endEventIndex: pageParam,
    })

  const {
    data,
    isLoading,
    error,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: getMarketRecordsQueryKey({
      market,
    }),
    queryFn: getMarketRecordsInternal,
    initialPageParam: market.eventIndex,
    getNextPageParam: getNextMarketRecordsWindowParam,
    refetchOnMount: false,
    staleTime: MARKET_RECORDS_QUERY_STALE_TIME,
    refetchInterval: 2 * 60 * 1000, // 2min
  })

  const records = (data?.pages ?? [])
    .flatMap((marketRecordsPage) => marketRecordsPage.records)
    .sort((a, b) => b.eventIndex - a.eventIndex)
  const filteredRecords = filterMarketRecords({
    records,
    kinds,
    search,
  })
  const startIndex = page * pageSize
  const endIndex = startIndex + pageSize
  const shouldFetchOlderRecords =
    page > 0 &&
    endIndex > filteredRecords.length &&
    Boolean(hasNextPage) &&
    !isLoading &&
    !isFetchingNextPage

  useEffect(() => {
    if (shouldFetchOlderRecords) {
      fetchNextPage()
    }
  }, [fetchNextPage, shouldFetchOlderRecords])

  const totalRecords = hasNextPage
    ? Math.max(filteredRecords.length + 1, (page + 2) * pageSize)
    : filteredRecords.length
  const pageData = {
    records: filteredRecords.slice(startIndex, endIndex),
    totalRecords,
    loadedRecords: records.length,
    windowStartEventIndex: data?.pages.at(-1)?.windowStartEventIndex,
    windowEndEventIndex: data?.pages[0]?.windowEndEventIndex,
  }

  let pagesCount: number | undefined
  if (pageData.totalRecords) {
    pagesCount = Math.ceil(pageData.totalRecords / pageSize)
  } else if (market.eventIndex) {
    pagesCount = Math.ceil(market.eventIndex / pageSize)
  }

  return {
    data: pageData,
    isLoading:
      isLoading || (isFetchingNextPage && startIndex >= filteredRecords.length),
    pagesCount,
    isError,
    error,
  }
}
